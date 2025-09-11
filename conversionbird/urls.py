"""
URL configuration for conversionbird project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from django.contrib import admin
from django.urls import path, include
from images.views import api_info, download_image
from documents.views import download_document
from audios.views import download_audio
from videos.views import download_video

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', api_info),
    path('api/images/', include('images.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/audios/', include('audios.urls')),
    path('api/videos/', include('videos.urls')),
    path('uploads/output/<str:filename>', download_image),
    path('uploads/documents/<str:filename>', download_document),
    path('uploads/audios/<str:filename>', download_audio),
    path('uploads/videos/<str:filename>', download_video),
]
