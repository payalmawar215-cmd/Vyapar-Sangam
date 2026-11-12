from django.urls import path
from .views import PlatformSettingsView, UploadVideoView, UploadPosterView

urlpatterns = [
    path('settings/', PlatformSettingsView.as_view(), name='platform-settings'),
    path('settings/upload/video/', UploadVideoView.as_view(), name='upload-video'),
    path('settings/upload/poster/', UploadPosterView.as_view(), name='upload-poster'),
]
