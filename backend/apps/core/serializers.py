from rest_framework import serializers
from .models import PlatformSettings

class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = ['id', 'intro_video_url', 'intro_video_poster', 'updated_at']
