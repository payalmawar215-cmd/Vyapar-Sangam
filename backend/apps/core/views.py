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


class SecureMediaView(APIView):
    """
    Authorized media serving endpoint.
    - Public media (settings videos/posters, category icons, etc.): served with proper headers.
    - Protected media:
      * verification_docs/: Requires authentication and ownership (listing owner or staff/admin).
      * signatures/: Requires authentication and ownership (inquiry buyer, listing owner, or staff/admin).
    - Prevents directory traversal attacks using robust commonpath & Path containment.
    - Uses exact stored file field paths in DB queries (never basename) to prevent collision attacks.
    """
    permission_classes = [AllowAny]

    def get(self, request, file_path):
        import mimetypes
        from pathlib import Path
        from django.http import FileResponse, Http404, HttpResponseForbidden
        from django.db.models import Q

        # Block null bytes or obvious injection patterns
        if '\x00' in file_path:
            return HttpResponseForbidden("Access denied.")

        media_root = Path(django_settings.MEDIA_ROOT).resolve()

        # Reject absolute paths or drive letters before resolving
        clean_path_str = file_path.replace('\\', '/')
        if clean_path_str.startswith('/') or (len(clean_path_str) > 1 and clean_path_str[1] == ':'):
            return HttpResponseForbidden("Access denied.")

        # Resolve target path
        try:
            target_path = (media_root / file_path).resolve()
        except (ValueError, RuntimeError):
            return HttpResponseForbidden("Access denied.")

        # Robust directory traversal containment check
        try:
            target_path.relative_to(media_root)
            if os.path.commonpath([str(media_root), str(target_path)]) != str(media_root):
                return HttpResponseForbidden("Access denied.")
        except (ValueError, Exception):
            return HttpResponseForbidden("Access denied.")

        if not target_path.exists() or not target_path.is_file():
            raise Http404("Requested file not found.")

        # Normalize relative path to POSIX format (matching Django FileField storage format)
        try:
            rel_path = target_path.relative_to(media_root).as_posix()
        except ValueError:
            return HttpResponseForbidden("Access denied.")

        user = getattr(request, 'user', None)
        is_authenticated = bool(user and user.is_authenticated)
        user_role = getattr(user, 'role', '').upper() if is_authenticated else ''
        is_admin = is_authenticated and (user.is_staff or user.is_superuser or user_role == 'ADMIN')

        # ----------------------------------------------------------------------
        # 1. Verification Documents: restricted to listing owner and staff/admin
        # ----------------------------------------------------------------------
        if rel_path.startswith('verification_docs/'):
            if not is_authenticated:
                return HttpResponseForbidden("Authentication required to access verification documents.")

            if not is_admin:
                from apps.listings.models import BusinessVerificationDocument
                # Query strictly by exact relative file path to avoid duplicate basename collisions
                doc = BusinessVerificationDocument.objects.filter(
                    Q(file=rel_path) | Q(file=rel_path.replace('/', '\\'))
                ).select_related('listing__owner').first()

                if not doc:
                    return HttpResponseForbidden("You do not have permission to view this verification document.")

                listing_owner = getattr(doc.listing, 'owner', None) if doc.listing else None
                if listing_owner != user:
                    return HttpResponseForbidden("You do not have permission to view this verification document.")

        # ----------------------------------------------------------------------
        # 2. NDA Signatures: restricted to inquiry buyer, listing owner, and admin
        # ----------------------------------------------------------------------
        elif rel_path.startswith('signatures/'):
            if not is_authenticated:
                return HttpResponseForbidden("Authentication required to access signature files.")

            if not is_admin:
                from apps.inquiries.models import InterestRequest
                # Query strictly by exact relative signature_file path
                req = InterestRequest.objects.filter(
                    Q(signature_file=rel_path) | Q(signature_file=rel_path.replace('/', '\\'))
                ).select_related('buyer', 'listing__owner').first()

                if not req:
                    return HttpResponseForbidden("You do not have permission to view this signature file.")

                listing_owner = getattr(req.listing, 'owner', None) if req.listing else None
                if req.buyer != user and listing_owner != user:
                    return HttpResponseForbidden("You do not have permission to view this signature file.")

        # ----------------------------------------------------------------------
        # 3. Serve File (Public media or Authorized Private media)
        # ----------------------------------------------------------------------
        content_type, _ = mimetypes.guess_type(str(target_path))
        content_type = content_type or 'application/octet-stream'
        return FileResponse(open(target_path, 'rb'), content_type=content_type)


