"""ulabel_vessel URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.contrib import admin
from django.urls import path
from UlabelVessel import views

urlpatterns = [
    path('admin/', admin.site.urls),
    url(r'login/$', views.login, name="log_in_page"),
    url(r'logout/$', views.logout, name="log_out_page"),
    url(r'register/$', views.register, name="register_page"),
    url(r'upload_dicoms/$', views.upload_dicoms,name="upload_dicoms_page"),
    url(r'ULabel_Fluoro/$', views.ULabel_Fluoro,name="ULabel_Fluoro_page"),
    url(r'ULabel_Fluoro_modify/$', views.ULabel_Fluoro_modify,name="ULabel_Fluoro_modify_page"),
    url(r'predict_selected_data/$', views.predict_selected_data,name="predict_selected_data"),
    url(r'get_predicted_data/$', views.get_predicted_data,name="get_predicted_data"),
    url(r'post_modify_label/$', views.post_modify_label,name="post_modify_label"),
    url(r'semantic_label/$', views.semantic_label,name="semantic_label"),
    url(r'save_semantic_labels/$', views.save_semantic_labels,name="save_semantic_labels"),
    url(r'progressurl/$', views.show_progress, name='progress'),
    url(r'download_file/$', views.download_file, name="download_file"),
    url(r'angleinforurl/$', views.get_angleinfor, name='angleinfor'),
]
