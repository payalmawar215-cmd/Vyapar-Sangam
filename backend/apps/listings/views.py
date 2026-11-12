from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from .models import Category, BusinessListing
from .serializers import CategorySerializer, BusinessListingSerializer, BusinessListingCreateSerializer
from apps.core.permissions import IsAdminRole, IsOwnerOrAdmin, notify_user


class CategoryListView(APIView):
    """List all categories. Admin can create new ones."""
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        cats = Category.objects.all()
        return Response(CategorySerializer(cats, many=True).data)

    def post(self, request):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        if not data.get('slug') and data.get('name'):
            data['slug'] = slugify(data['name'])
        serializer = CategorySerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=drf_status.HTTP_201_CREATED)
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)


class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_object(self, pk):
        return get_object_or_404(Category, pk=pk)

    def put(self, request, pk):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)
        cat = self.get_object(pk)
        serializer = CategorySerializer(cat, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)
        cat = self.get_object(pk)
        cat.delete()
        return Response(status=drf_status.HTTP_204_NO_CONTENT)


class BusinessListingListView(APIView):
    """
    GET: Public listing browse with filters.
    POST: Seller creates new listing.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = BusinessListing.objects.select_related('owner', 'category')

        # Role-based filtering
        if request.user.is_authenticated and (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            pass  # Admin sees all
        elif request.user.is_authenticated and request.user.role.upper() == 'SELLER':
            # Sellers see own listings + public approved ones
            qs = qs.filter(status__in=['approved', 'under_offer', 'sold']) | qs.filter(owner=request.user)
        else:
            qs = qs.filter(status='approved')

        # Filters
        category = request.GET.get('category')
        if category:
            qs = qs.filter(category__slug=category) | qs.filter(category__id=category)

        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')
        if min_price:
            try:
                qs = qs.filter(asking_price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                qs = qs.filter(asking_price__lte=float(max_price))
            except ValueError:
                pass

        min_years = request.GET.get('min_years')
        max_years = request.GET.get('max_years')
        if min_years:
            try:
                qs = qs.filter(years_in_operation__gte=int(min_years))
            except ValueError:
                pass
        if max_years:
            try:
                qs = qs.filter(years_in_operation__lte=int(max_years))
            except ValueError:
                pass

        search = request.GET.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(name__icontains=search) |
                Q(summary__icontains=search) |
                Q(city__icontains=search) |
                Q(state__icontains=search) |
                Q(category__name__icontains=search)
            )

        stat_filter = request.GET.get('status')
        if stat_filter:
            qs = qs.filter(status=stat_filter)

        sort = request.GET.get('sort', '-created_at')
        sort_map = {
            'price_asc': 'asking_price',
            'price_desc': '-asking_price',
            'newest': '-created_at',
            'oldest': 'created_at',
        }
        qs = qs.order_by(sort_map.get(sort, '-created_at'))

        # Featured first option
        featured = request.GET.get('featured')
        if featured:
            qs = qs.filter(is_featured=True)

        serializer = BusinessListingSerializer(qs.distinct(), many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=drf_status.HTTP_401_UNAUTHORIZED)
        if request.user.role.upper() not in ['SELLER', 'ADMIN'] and not request.user.is_staff:
            return Response({'error': 'Only sellers can create listings.'}, status=drf_status.HTTP_403_FORBIDDEN)

        serializer = BusinessListingCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            listing = serializer.save()
            return Response(BusinessListingSerializer(listing, context={'request': request}).data,
                            status=drf_status.HTTP_201_CREATED)
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)


class BusinessListingDetailView(APIView):
    """GET a single listing. PATCH/PUT to update (owner or admin). DELETE (owner or admin)."""
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_object(self, pk):
        return get_object_or_404(BusinessListing, pk=pk)

    def get(self, request, pk):
        listing = self.get_object(pk)
        # Increment view count for non-owner anonymous/buyers
        if not request.user.is_authenticated or request.user != listing.owner:
            BusinessListing.objects.filter(pk=pk).update(views_count=listing.views_count + 1)
        return Response(BusinessListingSerializer(listing, context={'request': request}).data)

    def patch(self, request, pk):
        listing = self.get_object(pk)
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=drf_status.HTTP_401_UNAUTHORIZED)
        if listing.owner != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'You do not have permission to edit this listing.'}, status=drf_status.HTTP_403_FORBIDDEN)

        # Non-admins cannot change status to approved/rejected directly
        data = request.data.copy()
        if request.user.role.upper() not in ['ADMIN'] and not request.user.is_staff:
            data.pop('status', None)

        serializer = BusinessListingCreateSerializer(listing, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated = serializer.save()
            return Response(BusinessListingSerializer(updated, context={'request': request}).data)
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        listing = self.get_object(pk)
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=drf_status.HTTP_401_UNAUTHORIZED)
        if listing.owner != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)
        listing.delete()
        return Response({'message': 'Listing deleted.'}, status=drf_status.HTTP_204_NO_CONTENT)


class ListingApproveView(APIView):
    """Admin: Approve a pending listing."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)
        from .models import ListingReviewHistory
        from django.utils import timezone
        listing = get_object_or_404(BusinessListing, pk=pk)
        listing.status = 'approved'
        listing.rejection_reason = ''
        listing.rejection_feedback = ''
        listing.save()

        ListingReviewHistory.objects.create(
            listing=listing,
            reviewer=request.user,
            action='approved',
            reason='',
            feedback=''
        )
        notify_user(listing.owner, 'Listing Approved',
                    f'Your listing "{listing.title}" has been approved and is now live.',
                    f'/business/{listing.id}', 'success')
        return Response({'message': 'Listing approved.', 'status': 'approved'})


class ListingRejectView(APIView):
    """Admin: Reject a listing with reason and feedback."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)
        from .models import ListingReviewHistory
        from django.utils import timezone
        listing = get_object_or_404(BusinessListing, pk=pk)

        reason = request.data.get('reason', 'Incomplete business information')
        feedback = request.data.get('feedback', '')
        action = request.data.get('status', 'rejected')  # 'rejected' or 'changes_required'

        if action not in ['rejected', 'changes_required']:
            action = 'rejected'

        listing.status = action
        listing.rejection_reason = reason
        listing.rejection_feedback = feedback
        listing.rejected_at = timezone.now()
        listing.save()

        ListingReviewHistory.objects.create(
            listing=listing,
            reviewer=request.user,
            action=action,
            reason=reason,
            feedback=feedback
        )
        notify_user(listing.owner, 'Listing Update Required' if action == 'changes_required' else 'Listing Rejected',
                    f'Your listing "{listing.title}" was {action.replace("_", " ")}. Reason: {reason}',
                    f'/my-listings', 'error')
        return Response({
            'message': f'Listing marked as {action}.',
            'status': listing.status,
            'rejection_reason': reason,
            'rejection_feedback': feedback
        })


class ListingResubmitView(APIView):
    """Seller: Resubmit a corrected listing for admin approval."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .models import ListingReviewHistory
        from django.utils import timezone
        listing = get_object_or_404(BusinessListing, pk=pk)
        if listing.owner != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        listing.status = 'pending'
        listing.resubmitted_at = timezone.now()
        listing.save()

        ListingReviewHistory.objects.create(
            listing=listing,
            reviewer=request.user,
            action='resubmitted',
            reason='',
            feedback=request.data.get('note', 'Seller made revisions and resubmitted for approval.')
        )

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admins = User.objects.filter(role__iexact='ADMIN') | User.objects.filter(is_superuser=True)
        for adm in admins.distinct():
            notify_user(adm, 'Listing Resubmitted',
                        f'Seller has resubmitted listing "{listing.title}" for review.',
                        f'/admin/pending', 'info')

        return Response({
            'message': 'Listing resubmitted for review.',
            'status': 'pending',
            'resubmitted_at': listing.resubmitted_at
        })


class VerificationDocumentUploadView(APIView):
    """
    Seller/Admin: Upload supporting document for business verification.
    Stored privately in 'verification_docs/'.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        from .models import BusinessVerificationDocument
        import os
        import uuid
        from django.core.files.storage import default_storage

        listing = get_object_or_404(BusinessListing, pk=pk)
        if listing.owner != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No document file provided.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in allowed:
            return Response({'error': 'Supported formats: PDF, JPG, JPEG, PNG, WEBP.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        if file.size > 15 * 1024 * 1024:
            return Response({'error': 'File exceeds the 15 MB limit.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        doc_type = request.data.get('document_type', 'business_registration')
        title = request.data.get('title', '') or file.name

        clean_name = os.path.basename(file.name).replace(' ', '_')
        unique_token = uuid.uuid4().hex[:10]
        filename = f"verification_docs/{listing.id}_{unique_token}_{clean_name}"
        path = default_storage.save(filename, file)

        doc = BusinessVerificationDocument.objects.create(
            listing=listing,
            document_type=doc_type,
            title=title,
            file=path,
            file_name=file.name,
            file_size=file.size,
            status='pending'
        )

        from .serializers import BusinessVerificationDocumentSerializer
        return Response(BusinessVerificationDocumentSerializer(doc, context={'request': request}).data,
                        status=drf_status.HTTP_201_CREATED)


class VerificationDocumentDeleteView(APIView):
    """Delete a verification document."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, doc_id):
        from .models import BusinessVerificationDocument
        listing = get_object_or_404(BusinessListing, pk=pk)
        if listing.owner != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        doc = get_object_or_404(BusinessVerificationDocument, pk=doc_id, listing=listing)
        doc.delete()
        return Response({'message': 'Document deleted.'}, status=drf_status.HTTP_204_NO_CONTENT)


class VerificationSubmitView(APIView):
    """Seller: Submit business listing for verification."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        listing = get_object_or_404(BusinessListing, pk=pk)
        if listing.owner != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        if not listing.verification_documents.exists():
            return Response({'error': 'Please upload at least one verification document before submitting.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)

        listing.verification_status = 'under_verification'
        listing.save()

        from django.contrib.auth import get_user_model
        User = get_user_model()
        admins = User.objects.filter(role__iexact='ADMIN') | User.objects.filter(is_superuser=True)
        for adm in admins.distinct():
            notify_user(adm, 'New Verification Request',
                        f'Seller requested verification for "{listing.title}".',
                        f'/admin/listings', 'info')

        return Response({
            'message': 'Listing submitted for verification.',
            'verification_status': listing.verification_status
        })


class VerificationReviewView(APIView):
    """Admin: Review verification, award Verified badge or request changes."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)

        from django.utils import timezone
        listing = get_object_or_404(BusinessListing, pk=pk)
        ver_status = request.data.get('status')
        if ver_status not in ['verified', 'changes_required']:
            return Response({'error': "Status must be 'verified' or 'changes_required'."}, status=drf_status.HTTP_400_BAD_REQUEST)

        feedback = request.data.get('feedback', '')
        internal_notes = request.data.get('notes', '')

        listing.verification_status = ver_status
        listing.verification_feedback = feedback
        listing.verification_notes = internal_notes

        if ver_status == 'verified':
            listing.verified_at = timezone.now()
            listing.verified_by = request.user
            notify_user(listing.owner, 'Business Verified!',
                        f'Congratulations! Your listing "{listing.title}" is now verified with a badge.',
                        f'/business/{listing.id}', 'success')
        else:
            notify_user(listing.owner, 'Verification Changes Required',
                        f'Changes requested for verification on "{listing.title}". Feedback: {feedback}',
                        f'/my-listings', 'error')

        listing.save()
        return Response({
            'message': f"Verification updated to {ver_status}.",
            'verification_status': listing.verification_status,
            'verified_at': listing.verified_at
        })


class AdminVerificationListView(APIView):
    """Admin: List all businesses with verification requests."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)

        qs = BusinessListing.objects.exclude(verification_status='not_submitted').select_related('owner', 'category')
        stat = request.GET.get('status')
        if stat:
            qs = qs.filter(verification_status=stat)

        from .serializers import BusinessListingSerializer
        return Response(BusinessListingSerializer(qs, many=True, context={'request': request}).data)


class MyListingsView(APIView):
    """Seller's own listings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = BusinessListing.objects.filter(owner=request.user).select_related('category')
        serializer = BusinessListingSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


class ImageUploadView(APIView):
    """
    Upload one or multiple images for a listing to local media storage.
    Supports JPG, JPEG, PNG, WEBP.
    Returns { 'url': <primary_url>, 'urls': [<url1>, <url2>, ...], 'count': <number> }.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        import os
        import uuid
        from django.core.files.storage import default_storage
        from django.conf import settings as django_settings

        # Retrieve any files under 'images', 'image', or any multipart field name
        files = request.FILES.getlist('images') or request.FILES.getlist('image')
        if not files:
            files = list(request.FILES.values())

        if not files:
            return Response({'error': 'No image provided. Please select at least one image file.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        allowed = ['.jpg', '.jpeg', '.png', '.webp']
        max_size = 10 * 1024 * 1024  # 10 MB per image

        uploaded_urls = []
        for file in files:
            ext = os.path.splitext(file.name)[1].lower()
            if ext not in allowed:
                return Response(
                    {'error': f"File '{file.name}' has an unsupported extension '{ext}'. Only JPG, JPEG, PNG, and WEBP images are supported."},
                    status=drf_status.HTTP_400_BAD_REQUEST
                )
            if file.size > max_size:
                return Response(
                    {'error': f"File '{file.name}' exceeds the 10 MB limit ({round(file.size / (1024 * 1024), 1)} MB)."},
                    status=drf_status.HTTP_400_BAD_REQUEST
                )

            # Sanitize filename and ensure uniqueness
            clean_name = os.path.basename(file.name).replace(' ', '_')
            unique_token = uuid.uuid4().hex[:8]
            filename = f"listings/images/{request.user.id}_{unique_token}_{clean_name}"
            path = default_storage.save(filename, file)
            url = request.build_absolute_uri(django_settings.MEDIA_URL + path)
            uploaded_urls.append(url)

        return Response({
            'url': uploaded_urls[0],
            'urls': uploaded_urls,
            'count': len(uploaded_urls),
            'message': f"Successfully uploaded {len(uploaded_urls)} image{'s' if len(uploaded_urls) > 1 else ''}."
        }, status=drf_status.HTTP_201_CREATED)
