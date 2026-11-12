import os
from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings as django_settings
from .models import PlatformSettings
from .serializers import PlatformSettingsSerializer


class PlatformSettingsView(APIView):
    """Get or update platform settings (intro video & poster)."""
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        obj, _ = PlatformSettings.objects.get_or_create(id=1)
        return Response(PlatformSettingsSerializer(obj).data)

    def patch(self, request):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)
        obj, _ = PlatformSettings.objects.get_or_create(id=1)
        serializer = PlatformSettingsSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        return self.patch(request)


class UploadVideoView(APIView):
    """Admin upload intro video (MP4)."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file') or request.FILES.get('video')
        if not file:
            return Response({'error': 'No video file provided.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        filename = f"settings/videos/{file.name}"
        path = default_storage.save(filename, file)
        url = request.build_absolute_uri(django_settings.MEDIA_URL + path)

        # Automatically update settings
        obj, _ = PlatformSettings.objects.get_or_create(id=1)
        obj.intro_video_url = url
        obj.save()

        return Response({'file_url': url, 'url': url}, status=drf_status.HTTP_201_CREATED)


class UploadPosterView(APIView):
    """Admin upload intro video poster image."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file') or request.FILES.get('poster')
        if not file:
            return Response({'error': 'No image file provided.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        filename = f"settings/posters/{file.name}"
        path = default_storage.save(filename, file)
        url = request.build_absolute_uri(django_settings.MEDIA_URL + path)

        # Automatically update settings
        obj, _ = PlatformSettings.objects.get_or_create(id=1)
        obj.intro_video_poster = url
        obj.save()

        return Response({'file_url': url, 'url': url}, status=drf_status.HTTP_201_CREATED)
