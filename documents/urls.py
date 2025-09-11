from django.urls import path
from . import views

urlpatterns = [
    path('', views.api_info_documents),
    path('formats', views.get_document_formats),
    path('convert', views.convert_document),
    path('merge', views.merge_documents),
    path('split', views.split_document),
    path('watermark', views.add_watermark),
    path('password', views.pdf_password_protect),
]