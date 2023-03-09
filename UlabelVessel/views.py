from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import render, redirect
import base64
from os.path import isdir, dirname, join
from os import mkdir, listdir
import os
import pydicom
import json
import keras
import numpy as np
import cv2
from django.contrib.auth.decorators import login_required
import matplotlib.pyplot as plt
from .UNETPLUS4VESSEL.segmentation_models import Unet, Nestnet, Xnet, FPN_XNET
from .UNETPLUS4VESSEL.helper_functions import threshold_by_otsu, generate_largest_region, dice_coef_loss, mean_iou, \
    dice_coef
from django.contrib.sessions.models import Session
from tqdm import tqdm
from ulabel_vessel.settings import BASE_DIR
import SimpleITK as sitk
from keras.models import load_model
from UlabelVessel import models
import threading
import zipfile

DATA_DIR = os.path.join(os.path.join(BASE_DIR, "static"), "upload")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'


def register(request):
    if request.method == 'GET':
        return render(request, 'register.html')
    if request.method == 'POST':
        name = request.POST.get('username')
        pwd = request.POST.get('password')
        re_pwd = request.POST.get('re_password')
        if name and pwd and re_pwd:
            if pwd == re_pwd:
                user_obj = models.Fluoro_User.objects.filter(name=name).first()
                if user_obj:
                    return render(request, 'register.html',
                                  {'msg': 'The user you were trying to create already exists'})
                    # return HttpResponse('The user you were trying to create already exists')
                else:
                    models.Fluoro_User.objects.create(name=name, pwd=pwd).save()
                    return redirect('/login/')
            else:
                return render(request, 'register.html', {'msg': 'Passwords does not match! '})
                # return HttpResponse('Passwords does not match! ')

        else:
            return render(request, 'register.html', {'msg': 'Can not be blank! '})
            # return HttpResponse('Can not be blank! ')


def login(request):
    global DATA_DIR
    # request这是前端请求发来的请求，携带的所有数据，django给我们做了一些列的处理，封装成一个对象传过来
    if request.method == 'GET':
        return render(request, 'login.html')
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user_obj = models.Fluoro_User.objects.filter(name=username, pwd=password).first()
        if user_obj:
            request.session["is_login"] = True
            request.session["username"] = username
            # DATA_DIR = os.path.join(os.path.join(BASE_DIR, "static"), "upload")
            # user = request.session.get("username")
            # DATA_DIR = os.path.join(DATA_DIR, user)
            # if not isdir(DATA_DIR):
            #     mkdir(DATA_DIR)
            return render(request, "upload_dicoms.html", {'username': username})


        else:
            return render(request, 'login.html', {'msg': 'ERROR Incorrect username or password'})


def logout(request):
    request.session.flush()
    return render(request, 'login.html', {'msg': 'logout ok!'})


# Create your views here.
num_progress = 0
model = 0


# def construct_model():
#     global model
#     BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
#     model_dir = os.path.join(BASE_DIR, "UlabelVessel")
#     model_dir = os.path.join(model_dir, "UNETPLUS4VESSEL")
#     model_dir = os.path.join(model_dir, "vessel_no_LCA_LAO")
#
#     model = load_model(os.path.join(model_dir, "weights_all.h5"),
#                        custom_objects={'dice_coef_loss': dice_coef_loss, 'mean_iou': mean_iou,
#                                        'dice_coef': dice_coef})
#     print('test model...')
#     model.predict(np.zeros((1, 512, 512, 3)))
#     print('test done.')
# construct_model()

# = FPN_XNET(backbone_name='inceptionresnetv2', encoder_weights='imagenet', decoder_block_type='transpose',
#                          input_shape=(512, 512, 3))
def predict_all_selected_data(model, subjects, indexes, file_dir):
    # global num_progress

    print('test model...')
    model.predict(np.zeros((1, 512, 512, 3)))
    print('test done.')
    for i in tqdm(range(len(subjects))):
        # num_progress = i * 100 / len(subjects)
        # print(num_progress)
        image_x_path1 = os.path.join(file_dir.replace("..", BASE_DIR), "{}".format(subjects[i]))
        image_x_path2 = os.path.join(image_x_path1, "images")
        image_x_path = os.path.join(image_x_path2, "{}.png".format(int(indexes[i])))
        save_path1 = os.path.join(image_x_path1, "predict")
        save_path = os.path.join(save_path1, "{}.png".format(int(indexes[i])))
        sss = os.path.join(save_path1, "{}_p.png".format(int(indexes[i])))
        image_x = cv2.imread(image_x_path)
        image_shape = image_x.shape[:2]
        image_x = cv2.resize(image_x, (512, 512)) / 255.
        image_pred = model.predict(np.expand_dims(image_x, 0))

        plt.imsave(fname=sss, arr=np.squeeze(image_pred), cmap="gray")

        image_bin = threshold_by_otsu(np.squeeze(image_pred), flatten=False)
        image_bin_lr = generate_largest_region(np.squeeze(image_bin))

        image_bin_lr = cv2.resize(image_bin_lr, (image_shape[0], image_shape[1]))
        plt.imsave(fname=save_path, arr=np.squeeze(image_bin_lr), cmap="gray")


def transform_image_from_simpleitk(dicom_dir, save_dir):
    '''
        读取某文件夹内的所有dicom文件
    :param src_dir: dicom文件夹路径
    :return: image array
    '''
    # 提取dicom文件中的像素值
    dicom_file = sitk.ReadImage(dicom_dir)
    dicom_data = sitk.GetArrayFromImage(dicom_file)
    # dicom_file = pydicom.dcmread(dicom_dir)
    # dicom_data = dicom_file.pixel_array
    if len(dicom_data.shape) == 2:
        dicom_data = np.expand_dims(dicom_data, 0)

    for index in range(dicom_data.shape[0]):
        save_img_dir = os.path.join(save_dir, "{}.png".format(index + 1))
        cv2.imwrite(save_img_dir, dicom_data[index])


# upload_subjects = []


def upload_dicoms(request):
    # global upload_subjects
    dcm_file = False
    upload_subjects = []

    is_login = request.session.get("is_login", False)
    if is_login:

        if request.method == 'POST':
            # Get uploaded files
            uploadedFile_list = request.FILES.getlist('Scores')
            for uploadedFile in uploadedFile_list:
                if not uploadedFile:
                    return render(request, 'upload_dicoms.html', {'msg': 'No file selected'})
                if uploadedFile.name.rfind(".") != -1:
                    if uploadedFile.name.rfind("DCM") == -1 and uploadedFile.name.rfind("dcm") == -1:
                        return render(request, 'upload_dicoms.html', {'msg': 'Must choose dicom file'})
                    else:
                        dcm_file = True
            # Create a folder to store uploaded files
            for uploadedFile in uploadedFile_list:
                if dcm_file == True:
                    uploadDir = os.path.join(DATA_DIR, uploadedFile.name[:-4])
                else:
                    uploadDir = os.path.join(DATA_DIR, uploadedFile.name)
                while (os.path.exists(uploadDir)):
                    if dcm_file == True:
                        uploadedFile.name = uploadedFile.name[:-4] + "_1.DCM"
                        uploadDir = os.path.join(DATA_DIR, uploadedFile.name[:-4])
                    else:
                        uploadedFile.name = uploadedFile.name + "_1"
                        uploadDir = os.path.join(DATA_DIR, uploadedFile.name)
                if not isdir(uploadDir):
                    mkdir(uploadDir)
                    imgsDir = os.path.join(uploadDir, "images")
                    mkdir(imgsDir)
                    predictDir = os.path.join(uploadDir, "predict")
                    mkdir(predictDir)
                # Upload
                dstFilename = join(uploadDir, uploadedFile.name)

                if dcm_file == True:
                    upload_subjects.append(uploadedFile.name[:-4])
                else:
                    upload_subjects.append(uploadedFile.name)
                with open(dstFilename, 'wb') as fp:
                    for chunk in uploadedFile.chunks():
                        fp.write(chunk)
                transform_image_from_simpleitk(dstFilename, imgsDir)
            context = {}
            context['msg'] = 'Success'
            request.session["filename"] = upload_subjects
            return render(request, 'upload_dicoms.html', context)
        else:
            return render(request, 'upload_dicoms.html', {'msg': None})
    else:
        return render(request, 'login.html', {'msg': 'Please input the account and password first'})


def ULabel_Fluoro(request):
    upload_subjects = request.session["filename"]

    context = {}
    context["index"] = 0
    imgs_num = []
    is_login = request.session.get("is_login", False)
    if is_login:
        session_key = request.session.session_key
        session = Session.objects.get(session_key=session_key)
        filename = session.get_decoded().get('filename')
        username = request.session.get("username")
        models.User_file.objects.create(name=username, filename=filename).save()

        for file in upload_subjects:
            num = 0
            for img in os.listdir(os.path.join(os.path.join(DATA_DIR, file), "images")):
                num = num + 1
            imgs_num.append(num)
        context["imgs_num"] = json.dumps(imgs_num)
        context["files"] = json.dumps(upload_subjects)
        context["file_dir"] = json.dumps("../static/upload/")
        return render(request, template_name="ULabel_Fluoro.html", context=context)
    else:
        return render(request, 'login.html', {'msg': 'Please input the account and password first'})


# context1 = {'sujects_list': '["1_LCA_LAO", "1_LCA_RAO"]', 'indexes_list': '["31", "23"]', 'file_dir': '["../static/upload/"]'}


lock1 = threading.RLock()  # 初始化锁对象


def predict_selected_data(request):
    # global states
    # if states == 0:
    #     states = 1
    global num_progress
    global model
    lock1.acquire()
    context1 = {}
    is_login = request.session.get("is_login", False)
    if is_login:

        if num_progress == 0:
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_dir = os.path.join(BASE_DIR, "UlabelVessel")
            model_dir = os.path.join(model_dir, "UNETPLUS4VESSEL")
            model_dir = os.path.join(model_dir, "vessel_no_LCA_LAO")

            # model = load_model(os.path.join(model_dir, "weights_all.h5"),
            #                    custom_objects={'dice_coef_loss': dice_coef_loss, 'mean_iou': mean_iou,
            #                                    'dice_coef': dice_coef})
            model = FPN_XNET(backbone_name='inceptionresnetv2', encoder_weights='imagenet',
                             decoder_block_type='transpose',
                             input_shape=(512, 512, 3))  # build UNet++

            model.load_weights(os.path.join(model_dir, "weights.h5"))
            print('test model...')
            model.predict(np.zeros((1, 512, 512, 3)))
            print('test done.')

        print("loading model")
        request.session["subjects_list"] = request.POST.getlist("selected_subjects")
        request.session["indexes_list"] = request.POST.getlist("selected_indexes")
        request.session["file_dir"] = request.POST.getlist("img_dir")

        subjects_list = request.session["subjects_list"]
        indexes_list = request.session["indexes_list"]
        file_dir = request.session["file_dir"]
        num_progress = 50
        predict_all_selected_data(model, subjects_list, indexes_list, file_dir[0])

        context1["sujects_list"] = json.dumps(subjects_list)
        context1["indexes_list"] = json.dumps(indexes_list)
        context1["file_dir"] = json.dumps(file_dir)
        request.session["context1"] = context1
        lock1.release()
        return JsonResponse(context1)
    else:
        return render(request, 'login.html', {'msg': 'Please input the account and password first'})


def ULabel_Fluoro_modify(request):
    is_login = request.session.get("is_login", False)

    if is_login:
        context1 = request.session["context1"]
        print(context1)
        return render(request, template_name="ULabel_Fluoro_modify.html", context=context1)
    else:
        return render(request, 'login.html', {'msg': 'Please input the account and password first'})


def get_predicted_data(request):
    request.session["img_index"] = int(request.GET.getlist("index")[0])

    request.session["file_dir"] = request.GET.getlist("file_dir")[0].replace("..", ".")
    request.session["subject"] = request.GET.getlist("subject")[0]

    img_index = request.session["img_index"]
    file_dir = request.session["file_dir"]
    subject = request.session["subject"]
    print(os.path.join(os.path.join(os.path.join(file_dir, subject), "predict"), "{}.png".format(img_index)))
    if os.path.exists(os.path.join(os.path.join(file_dir, subject), "manual")):
        label = cv2.imread(
            os.path.join(os.path.join(os.path.join(file_dir, subject), "manual"), "{}.png".format(img_index))
            , cv2.IMREAD_GRAYSCALE)
    else:
        label = cv2.imread(
            os.path.join(os.path.join(os.path.join(file_dir, subject), "predict"), "{}.png".format(img_index))
            , cv2.IMREAD_GRAYSCALE)
    pointsX = []
    pointsY = []
    for i in range(label.shape[0]):
        for j in range(label.shape[1]):
            if label[i][j] == 255:
                pointsX.append(i)
                pointsY.append(j)
    context = {}
    context["pointsX"] = pointsX
    context["pointsY"] = pointsY
    context["shape0"] = label.shape[0]
    context["shape1"] = label.shape[1]
    return JsonResponse(context)


def post_modify_label(request):
    request.session["img_index"] = int(request.POST.getlist("index")[0])
    request.session["file_dir"] = request.POST.getlist("file_dir")[0].replace("..", ".")
    request.session["subject"] = request.POST.getlist("subject")[0]

    img_index = request.session["img_index"]
    file_dir = request.session["file_dir"]
    subject = request.session["subject"]
    save_dir = os.path.join(os.path.join(file_dir, subject), "manual")
    if not os.path.exists(save_dir):
        os.mkdir(save_dir)
    label_URL = request.POST.getlist("label")[0]

    label_img_url = label_URL[label_URL.rfind("base64") + 7:]
    print(label_img_url)
    img = base64.b64decode(label_img_url)
    nparr = np.fromstring(img, np.uint8)
    img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)[:, :, 2]
    # width = int(request.POST.getlist("img_x")[0])
    # height = int(request.POST.getlist("img_y")[0])
    # label_mask = np.zeros((width,height))
    # for i in range(len(label_X)):
    #     label_mask[int(label_Y[i])][int(label_X[i])] = 255
    cv2.imwrite(os.path.join(save_dir, "{}.png".format(img_index)), img_np)
    contest = {}
    contest["flag"] = json.dumps("finish")
    return JsonResponse(contest)


# def post_modify_label(request):
#     img_index = int(request.POST.getlist("index")[0])
#     file_dir = request.POST.getlist("file_dir")[0].replace("..", ".")
#     subject = request.POST.getlist("subject")[0]
#     save_dir = os.path.join(os.path.join(file_dir,subject),"manual")
#     if not os.path.exists(save_dir):
#         os.mkdir(save_dir)
#     label_X = request.POST.getlist("label_x")
#     label_Y = request.POST.getlist("label_y")
#     width = int(request.POST.getlist("img_x")[0])
#     height = int(request.POST.getlist("img_y")[0])
#     label_mask = np.zeros((width,height))
#     for i in range(len(label_X)):
#         label_mask[int(label_Y[i])][int(label_X[i])] = 255
#     cv2.imwrite(os.path.join(save_dir,"{}.png".format(img_index)),label_mask)
#     contest = {}
#     contest["flag"] = json.dumps("finish")
#     return JsonResponse(contest)


def semantic_label(request):
    is_login = request.session.get("is_login", False)
    if is_login:
        context1 = request.session["context1"]
        return render(request, template_name="semantic_label.html", context=context1)
    else:
        return render(request, 'login.html', {'msg': 'Please input the account and password first'})


def load_dicom_write_json(file_dir, subject, jsondic, index, jsondic_range):
    # Label_names1 = ["Sep1", "Sep2", "Sep3", "Br1", "Br2", "Br3", "Br4",
    #                    "Br5", "Br6"]
    #     Label_names2 = ["RVb","RM","RM1","RM2","PDAb1","PDAb2","PDAb3","PDAb4","PDAb5","PLBb1","PLBb2","PLBb3","PLBb4","PLBb5"]
    Label_names1 = ["LAD", "R1", "D1", "D2", "LCX", "OM1", "OM2", "LMA"]
    Label_names2 = ["RMA", "PDA", "PLB"]

    if jsondic_range["LMA"] != []:
        for name in Label_names1:
            jsondic[name] = jsondic_range[name]
            json_name = subject + "_LCA"
    else:

        for name in Label_names2:
            jsondic[name] = jsondic_range[name]
            json_name = subject + "_RCA"
    if not os.path.exists(os.path.join(os.path.join(file_dir, subject), subject)):
        dicom_dir = os.path.join(os.path.join(file_dir, subject), subject + ".DCM")
    else:
        dicom_dir = os.path.join(os.path.join(file_dir, subject), subject)
    img_path = os.path.join(os.path.join(os.path.join(file_dir, subject), "images"), "{}.png".format(index))
    image = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    dicom_file = pydicom.dcmread(dicom_dir)
    pixel_list = []
    for i in range(image.shape[0]):
        for j in range(image.shape[1]):
            pixel_list.append(image[i][j])
    jsondic["Rows"] = dicom_file.data_element("Rows").value
    jsondic["Columns"] = dicom_file.data_element("Columns").value
    jsondic["Image_Pixels"] = str(pixel_list)
    jsondic["ImagerPixelSpacing"] = str(dicom_file.data_element("ImagerPixelSpacing").value)
    jsondic["PositionerPrimaryAngle"] = dicom_file.data_element("PositionerPrimaryAngle").value
    jsondic["PositionerSecondaryAngle"] = dicom_file.data_element("PositionerSecondaryAngle").value
    jsondic["DistanceSourceToPatient"] = dicom_file.data_element("DistanceSourceToPatient").value
    jsondic["DistanceSourceToDetector"] = dicom_file.data_element("DistanceSourceToDetector").value
    if jsondic["PositionerPrimaryAngle"] < 0:
        json_name = json_name + "_RAO"
    else:
        json_name = json_name + "_LAO"
    filename = os.path.join(os.path.join(file_dir, subject), "{}.json".format(json_name))
    with open(filename, 'w') as file_obj:
        json.dump(jsondic, file_obj, indent=2)


def trans_labelsdic(labelsdic):
    names = []
    label_X = []
    label_Y = []
    for label in labelsdic:
        names.append(label["label"])
        label_X.append(label["X"])
        label_Y.append(label["Y"])
    return names, label_X, label_Y


def save_semantic_labels(request):
    jsondic = {}
    jsondic_range = {}
    request.session["img_index"] = int(request.POST.getlist("index")[0])
    request.session["file_dir"] = request.POST.getlist("file_dir")[0].replace("..", ".")
    request.session["subject"] = request.POST.getlist("subject")[0]
    img_index = request.session["img_index"]
    file_dir = request.session["file_dir"]
    subject = request.session["subject"]
    print(subject)
    print(img_index, file_dir, subject)
    save_dir = os.path.join(os.path.join(file_dir, subject), "semantic")
    print(save_dir)
    if not os.path.exists(save_dir):
        os.mkdir(save_dir)
    Labels = eval(request.POST.getlist("Labels")[0])
    names, label_X, label_Y = trans_labelsdic(Labels)
    width = int(request.POST.getlist("img_x")[0])
    height = int(request.POST.getlist("img_y")[0])

    for i in range(len(label_X)):
        jsonidx = []
        label_mask = np.zeros((width, height))
        now_arrayX = label_X[i]
        now_arrayY = label_Y[i]
        if len(now_arrayX) != 0:
            for j in range(len(now_arrayX)):
                label_mask[int(now_arrayY[j])][int(now_arrayX[j])] = 255
                jsonidx.append(str(tuple([now_arrayY[j], now_arrayX[j]])))
            cv2.imwrite(os.path.join(save_dir, "{}_{}.png".format(img_index, names[i])), label_mask)
        jsondic_range[names[i]] = jsonidx
    load_dicom_write_json(file_dir, subject, jsondic, img_index, jsondic_range)
    contest = {}
    contest["flag"] = json.dumps("finish")
    return JsonResponse(contest)


def show_progress(request):
    global num_progress
    # global states
    return JsonResponse(num_progress, safe=False)


def get_angleinfor(request):
    file_dir = request.GET.getlist("file_dir")[0].replace("..", ".")
    subject = request.GET.getlist("subject")[0]
    if not os.path.exists(os.path.join(os.path.join(file_dir, subject), subject)):
        dicompath = os.path.join(os.path.join(file_dir, subject), subject + ".DCM")
    else:
        dicompath = os.path.join(os.path.join(file_dir, subject), subject)
    dicom_file = pydicom.dcmread(dicompath)
    Angle1 = dicom_file.data_element("PositionerPrimaryAngle").value
    Angle2 = dicom_file.data_element("PositionerSecondaryAngle").value
    if Angle1 > 0:
        postinfor = "LAO: {}".format(np.abs(Angle1))
    else:
        postinfor = "RAO: {}".format(np.abs(Angle1))
    if Angle2 > 0:
        postinfor = "{}    CRA: {}".format(postinfor, np.abs(Angle2))
    else:
        postinfor = "{}    CAU: {}".format(postinfor, np.abs(Angle2))

    contest = {}
    contest["angleinfor"] = json.dumps(postinfor)
    return JsonResponse(contest)


def download_select(request):
    username = request.session['username']
    # user_obj = models.Fluoro_User.objects.filter(name=username).first()
    download_files = models.User_file.objects.filter(name=username)
    for i in download_files:
        print(i.name, i.filename)


# Download
# 勾画完成之后弹出框进行查表供用户进行下载哪个病人
def download_file(request):
    # 定义一个函数，递归读取absDir文件夹中所有文件，并塞进zipFile文件中。参数absDir表示文件夹的绝对路径。
    def writeAllFileToZip(absDir, zipFile):
        for f in os.listdir(absDir):
            absFile = os.path.join(absDir, f)  # 子文件的绝对路径
            if os.path.isdir(absFile):  # 判断是文件夹，继续深度读取。
                relFile = absFile[len(os.getcwd()) + 1:]  # 改成相对路径，否则解压zip是/User/xxx开头的文件。
                zipFile.write(relFile)  # 在zip文件中创建文件夹
                writeAllFileToZip(absFile, zipFile)  # 递归操作
            else:  # 判断是普通文件，直接写到zip文件中。
                relFile = absFile[len(os.getcwd()) + 1:]  # 改成相对路径
                zipFile.write(relFile)
        return

    username = request.session['username']
    # user_obj = models.Fluoro_User.objects.filter(name=username).first()
    download_files = models.User_file.objects.filter(name=username)
    for i in download_files:
        print(i.name, i.filename)
    download_name = request.session["subject"]
    file_name = download_name
    zipFilePath = os.path.join(DATA_DIR, "{}.zip".format(file_name))
    # 先定义zip文件绝对路径。sys.path[0]获取的是脚本所在绝对目录。
    # 因为zip文件存放在脚本同级目录，所以直接拼接得到zip文件的绝对路径。

    zipFile = zipfile.ZipFile(zipFilePath, "w", zipfile.ZIP_DEFLATED)

    # 创建空的zip文件(ZipFile类型)。参数w表示写模式。zipfile.ZIP_DEFLATE表示需要压缩，文件会变小。ZIP_STORED是单纯的复制，文件大小没变。
    absDir = os.path.join(DATA_DIR, file_name)
    # 要压缩的文件夹绝对路径。

    writeAllFileToZip(absDir, zipFile)  # 开始压缩。如果当前工作目录跟脚本所在目录一样，直接运行这个函数。
    # 执行这条压缩命令前，要保证当前工作目录是脚本所在目录(absDir的父级目录)。否则会报找不到文件的错误。
    """
    下载压缩文件
    :param request:
    :param id: 数据库id
    :return:
    """

    download_name = request.session["subject"]
    file_name = download_name  # 文件名
    file_path = os.path.join(DATA_DIR, "{}.zip".format(file_name))  # 下载文件的绝对路径
    print(file_path)
    if not os.path.isfile(file_path):  # 判断下载文件是否存在
        return HttpResponse("Sorry but Not Found the File")
    try:
        # 设置响应头
        # StreamingHttpResponse将文件内容进行流式传输，数据量大可以用这个方法
        response = StreamingHttpResponse(file_iterator(file_path))
        # 以流的形式下载文件,这样可以实现任意格式的文件下载
        response['Content-Type'] = 'application/octet-stream'
        # Content-Disposition就是当用户想把请求所得的内容存为一个文件的时候提供一个默认的文件名
        response['Content-Disposition'] = 'attachment;filename="{}.zip"'.format(file_name)
    except:
        return HttpResponse("Sorry but Not Found the File")

    return response


def file_iterator(file_path, chunk_size=1024):
    """
    文件生成器,防止文件过大，导致内存溢出
    :param file_path: 文件绝对路径
    :param chunk_size: 块大小
    :return: 生成器
    """
    with open(file_path, mode='rb') as f:
        while True:
            c = f.read(chunk_size)
            if c:
                yield c
            else:
                break
