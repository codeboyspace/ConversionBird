from django.urls import path
from . import views

urlpatterns = [
    path('formats', views.get_formats),
    path('convert', views.convert_audio),
]