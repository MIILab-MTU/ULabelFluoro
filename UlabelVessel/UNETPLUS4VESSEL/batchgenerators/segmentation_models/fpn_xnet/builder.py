from keras.layers import Conv2D
from keras.layers import Activation
from keras.layers import Concatenate
from keras.layers import SpatialDropout2D
from keras.models import Model
from keras.layers.core import Lambda

from .blocks import Transpose2D_block
from .blocks import Upsample2D_block
from .blocks import DeepSuperviseBlock
from ..utils import get_layer_number, to_tuple
from ..common import ResizeImage, Conv2DBlock

import numpy as np

def build_fpn_xnet(backbone,
                   classes,
                   skip_connection_layers,
                   upsampling_layer_names,
                   downsampling_layer_names,
                   decoder_filters=(256, 128, 64, 32, 16),
                   upsample_rates=(2, 2, 2, 2, 2),
                   n_upsample_blocks=5,
                   dropout=0.8,
                   block_type='upsampling',
                   activation='sigmoid',
                   use_batchnorm=True):
    input = backbone.input
    # print(n_upsample_blocks)

    if block_type == 'transpose':
        up_block = Transpose2D_block
    else:
        up_block = Upsample2D_block

    if len(skip_connection_layers) > n_upsample_blocks:
        downsampling_layers = skip_connection_layers[int(len(skip_connection_layers) / 2):]
        skip_connection_layers = skip_connection_layers[:int(len(skip_connection_layers) / 2)]
    else:
        downsampling_layers = skip_connection_layers

    # convert layer names to indices
    skip_connection_idx = ([get_layer_number(backbone, l) if isinstance(l, str) else l for l in skip_connection_layers])
    skip_layers_list = [backbone.layers[skip_connection_idx[i]].output for i in range(len(skip_connection_idx))]
    downsampling_idx = ([get_layer_number(backbone, l) if isinstance(l, str) else l for l in downsampling_layers])
    downsampling_list = [backbone.layers[downsampling_idx[i]].output for i in range(len(downsampling_idx))]
    downterm = [None] * (n_upsample_blocks + 1)
    for i in range(len(downsampling_idx)):
        if downsampling_list[0] == backbone.output:
            downterm[n_upsample_blocks - i] = downsampling_list[i]
        else:
            downterm[n_upsample_blocks - i - 1] = downsampling_list[i]
    downterm[-1] = backbone.output

    interm = [None] * (n_upsample_blocks + 1) * (n_upsample_blocks + 1)
    for i in range(len(skip_connection_idx)):
        interm[-i * (n_upsample_blocks + 1) + (n_upsample_blocks + 1) * (n_upsample_blocks - 1)] = skip_layers_list[i]
    interm[(n_upsample_blocks + 1) * n_upsample_blocks] = backbone.output

    for j in range(n_upsample_blocks):
        for i in range(n_upsample_blocks - j):
            upsample_rate = to_tuple(upsample_rates[i])
            # print(j, i)

            if i == 0 and j < n_upsample_blocks - 1 and len(skip_connection_layers) < n_upsample_blocks:
                interm[(n_upsample_blocks + 1) * i + j + 1] = None
            elif j == 0:
                if downterm[i + 1] is not None:
                    interm[(n_upsample_blocks + 1) * i + j + 1] = up_block(decoder_filters[n_upsample_blocks - i - 2],
                                                                           i + 1, j + 1, upsample_rate=upsample_rate,
                                                                           skip=interm[(n_upsample_blocks + 1) * i + j],
                                                                           use_batchnorm=use_batchnorm)(downterm[i + 1])
                else:
                    interm[(n_upsample_blocks + 1) * i + j + 1] = None
                # print("\n{} = {} + {}\n".format(interm[(n_upsample_blocks+1)*i+j+1], interm[(n_upsample_blocks+1)*i+j], downterm[i+1]))
            else:
                interm[(n_upsample_blocks + 1) * i + j + 1] = up_block(decoder_filters[n_upsample_blocks - i - 2],
                        i + 1, j + 1, upsample_rate=upsample_rate,
                        skip=interm[(n_upsample_blocks + 1) * i: (n_upsample_blocks + 1) * i + j + 1],
                        use_batchnorm=use_batchnorm)(interm[(n_upsample_blocks + 1) * (i + 1) + j])
                # print("\n{} = {} + {}\n".format(interm[(n_upsample_blocks+1)*i+j+1], interm[(n_upsample_blocks+1)*i : (n_upsample_blocks+1)*i+j+1], interm[(n_upsample_blocks+1)*(i+1)+j]))

    # full resolution
    full_resolution_output = Conv2D(classes, (3, 3), padding='same', name='final_conv')(interm[n_upsample_blocks])
    full_resolution_output = Activation(activation, name=activation)(full_resolution_output)

    # combine first
    model = Model(input, outputs=full_resolution_output)

    # multi-scale output
    multiscale_output_layer_index = [get_layer_number(model, layer_name) for layer_name in upsampling_layer_names]
    multiscale_output_layers = [model.layers[multiscale_output_layer_index[i]].output for i in range(len(multiscale_output_layer_index))]
    deep_supervise_for_ms_outputs = [full_resolution_output]
    for stage, multiscale_output_layer in enumerate(multiscale_output_layers):
        #DeepSuperviseBlock(filters, stage, cols, classes, activation, kernel_size=(3, 3), use_batchnorm=False):
        x = Conv2D(classes, (3, 3), padding='same', name='final_conv_%d-0' % stage)(multiscale_output_layer)
        x = Activation(activation, name=activation+"_final_%d" % (stage))(x)
        x = ResizeImage(to_tuple(np.prod(upsample_rates[:stage+1])))(x)
        deep_supervise_for_ms_outputs.append(x)

    x = Concatenate()(deep_supervise_for_ms_outputs)

    # final convolution
    n_filters = 32 * n_upsample_blocks
    x = Conv2DBlock(n_filters, (3, 3), use_batchnorm=use_batchnorm, padding='same')(x)
    if dropout is not None:
        x = SpatialDropout2D(dropout)(x)

    x = Conv2D(classes, (3, 3), padding='same')(x)
    x = Activation(activation)(x)

    """
    # raw feature refinement
    refinement_layer_index = [get_layer_number(model, layer_name) for layer_name in downsampling_layer_names]
    refinement_layers = [model.layers[refinement_layer_index[i]].output for i in range(len(refinement_layer_index))]
    feature_refinement_outputs = []
    for stage, refinement_layer in enumerate(refinement_layers):
        if stage == 0:
            x = Conv2D(classes, (3, 3), padding='same', name='final_conv_%d-0' % stage)(refinement_layer)
            x = Activation(activation, name=activation)(x)
            feature_refinement_outputs.append(x)
        else:
            x = refinement_layer
            for i in range(stage):
                x = Conv2D(x.get_shape()[-1].value, (3, 3), padding='same', name='final_conv_%d-%d' % (stage, i))(x)
                x = Activation(activation, name=activation)(x)
            x = Conv2D(classes, (3, 3), padding='same', name='final_conv_%d-%d' % (stage, stage))(refinement_layer)
            x = Activation(activation, name=activation)(x)
            feature_refinement_outputs.append(x)
    
    model_outputs = []
    model_outputs.append(full_resolution_output)
    model_outputs.extend([layer] for layer in deep_supervise_for_ms_outputs)
    model_outputs.extend([layer] for layer in feature_refinement_outputs)
    """

    model = Model(input, outputs=x)

    return model
