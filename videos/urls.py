from django.urls import path
from . import views

urlpatterns = [
    path('formats', views.get_video_formats),
    path('convert', views.convert_video),
    path('merge', views.merge_videos),
]