import numpy as np
import cv2
from time import time

from batchgenerators.augmentations.crop_and_pad_augmentations import crop
from batchgenerators.dataloading import MultiThreadedAugmenter, SingleThreadedAugmenter
from batchgenerators.transforms import Compose
from batchgenerators.utilities.data_splitting import get_split_deterministic
from batchgenerators.utilities.file_and_folder_operations import *
from batchgenerators.dataloading.data_loader import DataLoader
from batchgenerators.augmentations.utils import pad_nd_image
from batchgenerators.transforms.spatial_transforms import SpatialTransform_2, MirrorTransform
from batchgenerators.transforms.color_transforms import BrightnessMultiplicativeTransform, GammaTransform
from batchgenerators.transforms.noise_transforms import GaussianNoiseTransform, GaussianBlurTransform

from glob import glob
from tqdm import tqdm


class VesselDataLoader(DataLoader):

    def load_patient(self, image_file_id):
        data = cv2.imread("{}/training/{}.png".format(self.data_path, image_file_id), cv2.IMREAD_GRAYSCALE)
        seg = cv2.imread("{}/label/{}.png".format(self.data_path, image_file_id), cv2.IMREAD_GRAYSCALE)
        data = cv2.resize(data, (self.image_size, self.image_size))
        seg = cv2.resize(seg, (self.image_size, self.image_size))
        data = np.expand_dims(data, axis=0)
        seg = np.expand_dims(seg, axis=0)
        return data, seg

    def __init__(self,
                 data_path,
                 data_patient_names,
                 batch_size,
                 image_size,
                 num_threads_in_multithreaded,
                 seed_for_shuffle=1234, return_incomplete=False, shuffle=True, infinite=True):
        super(VesselDataLoader, self).__init__(data_patient_names, batch_size, num_threads_in_multithreaded, seed_for_shuffle,
                                               return_incomplete, shuffle, infinite)
        self.data_path = data_path
        self.image_size = image_size
        self.input_channel = 1
        self.output_channel = 1
        self.indices = list(range(len(data_patient_names)))

    def generate_train_batch(self):
        idx = self.get_indices()
        patients_for_batch = [self._data[i] for i in idx]

        # initialize empty array for data and seg
        data = np.zeros((self.batch_size, self.input_channel, self.image_size, self.image_size), dtype=np.float32)
        seg = np.zeros((self.batch_size, self.output_channel, self.image_size, self.image_size), dtype=np.float32)

        patient_names = []

        for i, j in enumerate(patients_for_batch):
            patient_data, patient_seg = self.load_patient(j)
            #patient_data, patient_seg = crop(data=np.expand_dims(patient_data, axis=0), # +b, c, w, h, z
            #                                 seg=np.expand_dims(patient_seg, axis=0),
            #                                 crop_size=self.image_size,
            #                                 crop_type="random")
            data[i] = patient_data
            seg[i] = patient_seg
            patient_names.append(j)

        # data = np.transpose(data, (0, 2, 3, 4, 1))
        # seg = np.transpose(seg, (0, 2, 3, 4, 1))

        return {'data': data, 'seg': seg, 'names': patient_names}


def get_train_transform(image_size,
                        rotation_angle=15,
                        elastic_deform=(0, 0.25),
                        scale_factor=(0.75, 1.25),
                        augmentation_prob=0.1):
    tr_transforms = []

    tr_transforms.append(
        SpatialTransform_2(
            (image_size, image_size),
            patch_center_dist_from_border=0, #[i // 2 for i in patch_size]
            do_elastic_deform=False, deformation_scale=elastic_deform,
            do_rotation=False,
            angle_x=(- rotation_angle / 360. * 2 * np.pi, rotation_angle / 360. * 2 * np.pi),
            angle_y=(- rotation_angle / 360. * 2 * np.pi, rotation_angle / 360. * 2 * np.pi),
            do_scale=False,
            scale=scale_factor,
            border_mode_data='constant',
            border_cval_data=0,
            border_mode_seg='constant',
            border_cval_seg=0,
            order_seg=1, order_data=1,
            random_crop=True,
            p_el_per_sample=augmentation_prob,
            p_rot_per_sample=augmentation_prob,
            p_scale_per_sample=augmentation_prob
        )
    )

    # now we mirror along all axes
    #tr_transforms.append(MirrorTransform(axes=(0, 1)))

    # brightness transform for 15% of samples
    tr_transforms.append(BrightnessMultiplicativeTransform((0.7, 1.5),
                                                            per_channel=True,
                                                            p_per_sample=augmentation_prob))

    # gamma transform. This is a nonlinear transformation of intensity values
    # (https://en.wikipedia.org/wiki/Gamma_correction)
    tr_transforms.append(GammaTransform(gamma_range=(0.5, 2), invert_image=False, per_channel=True, p_per_sample=0.15))
    # we can also invert the image_x, apply the transform and then invert back
    tr_transforms.append(GammaTransform(gamma_range=(0.5, 2), invert_image=True, per_channel=True, p_per_sample=0.15))

    # Gaussian Noise
    tr_transforms.append(GaussianNoiseTransform(noise_variance=(0, 0.05), p_per_sample=0.15))

    # blurring. Some BraTS cases have very blurry modalities. This can simulate more patients with this problem and
    # thus make the model more robust to it
    tr_transforms.append(GaussianBlurTransform(blur_sigma=(0.5, 1.5), different_sigma_per_channel=True,  p_per_channel=0.5, p_per_sample=0.15))

    # now we compose these transforms together
    tr_transforms = Compose(tr_transforms)
    return tr_transforms


def filepath_to_name(full_name):
    file_name = os.path.basename(full_name)
    file_name = os.path.splitext(file_name)[0]
    return file_name


def get_list_of_patients(data_path="./data"):
    training_image_files = glob("{}/training/*.png".format(data_path))
    patient_names = []
    for training_image_file in training_image_files:
        patient_names.append(filepath_to_name(training_image_file))
    return patient_names


def get_patients_in_dir(validation_path):
    image_files = glob("{}/*.png".format(validation_path))
    patients = []
    for image_file in image_files:
        patients.append(filepath_to_name(image_file))

    return patients


def get_generator_for_val(validation_path, image_size=512):
    patients = get_list_of_patients(validation_path)
    print("[x] found %d patients" % len(patients))
    dataloader_validation = VesselDataLoader(validation_path, patients, 1, image_size, 1)
    data_gen = SingleThreadedAugmenter(dataloader_validation, None)
    return data_gen, patients


def get_generator(args, image_size=512):
    """
    obtain data generators for training data and validation data
    :param args:
    :return:
    """
    patients = get_list_of_patients(args.data_path)
    print("[x] found %d patients" % len(patients))
    train_patients, val_patients = get_split_deterministic(patients, fold=args.cv, num_splits=args.cv_max, random_state=12345)

    dataloader_train = VesselDataLoader(args.data_path, train_patients, args.batch_size, image_size, 1)

    dataloader_validation = VesselDataLoader(args.data_path, val_patients, args.batch_size, image_size, 1)

    tr_transforms = get_train_transform(image_size)

    #tr_gen = SingleThreadedAugmenter(dataloader_train, tr_transforms)
    if args.debug:
        tr_gen = SingleThreadedAugmenter(dataloader_train, tr_transforms)
        val_gen = SingleThreadedAugmenter(dataloader_validation, None)
    else:
        tr_gen = MultiThreadedAugmenter(dataloader_train, tr_transforms, num_processes=args.n_workers, num_cached_per_queue=5, pin_memory=False)
        val_gen = MultiThreadedAugmenter(dataloader_validation, None, num_processes=args.n_workers, num_cached_per_queue=5, pin_memory=False)
        tr_gen.restart()
        val_gen.restart()

    return tr_gen, val_gen, train_patients, val_patients


if __name__ == "__main__":

    data_path = "data_no"
    patients = get_list_of_patients(data_path)
    print(len(patients))

    train_patients, val_patients = get_split_deterministic(patients, fold=0, num_splits=5, random_state=12345)

    num_threads_in_multithreaded = 3

    dataloader = VesselDataLoader(data_path=data_path,
                                  data_patient_names=train_patients,
                                  batch_size=1,
                                  image_size=512,
                                  num_threads_in_multithreaded=1)

    batch = next(dataloader)
    print(batch['data'].shape)
    print(batch['seg'].shape)

    dataloader_train = VesselDataLoader(data_path, train_patients, batch_size=1, image_size=512, num_threads_in_multithreaded=1)

    dataloader_validation = VesselDataLoader(data_path, val_patients, batch_size=1, image_size=512, num_threads_in_multithreaded=1)

    tr_transforms = get_train_transform(image_size=512)

    tr_gen = MultiThreadedAugmenter(dataloader_train, tr_transforms,
                                    num_processes=num_threads_in_multithreaded,
                                    num_cached_per_queue=3,
                                    pin_memory=False)
    val_gen = MultiThreadedAugmenter(dataloader_validation, None,
                                     num_processes=num_threads_in_multithreaded,
                                     num_cached_per_queue=3,
                                     pin_memory=False)

    tr_gen.restart()
    val_gen.restart()

    num_batches_per_epoch = 100
    num_validation_batches_per_epoch = 3
    num_epochs = 20
    # let's run this to get a time on how long it takes
    time_per_epoch = []
    start = time()
    for epoch in tqdm(range(num_epochs)):
        start_epoch = time()
        for b in range(num_batches_per_epoch):
            batch = next(tr_gen)
            # do network training here with this batch

        for b in range(num_validation_batches_per_epoch):
            batch = next(val_gen)
            # run validation here
        end_epoch = time()
        time_per_epoch.append(end_epoch - start_epoch)
    end = time()
    total_time = end - start
    print("Running %d epochs took a total of %.2f seconds with time per epoch being %s" %
          (num_epochs, total_time, str(time_per_epoch)))