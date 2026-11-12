from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import InterestRequest
from .serializers import InterestRequestSerializer, InterestRequestCreateSerializer
from apps.core.permissions import notify_user


class InterestRequestListView(APIView):
    """
    GET: List requests (role-filtered).
    POST: Buyer submits a new interest request.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        user = request.user
        role = user.role.upper()
        if role == 'ADMIN' or user.is_staff:
            qs = InterestRequest.objects.all()
        elif role == 'SELLER':
            qs = InterestRequest.objects.filter(seller=user)
        else:
            qs = InterestRequest.objects.filter(buyer=user)

        qs = qs.select_related('listing', 'buyer', 'seller').order_by('-created_at')
        return Response(InterestRequestSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role.upper() not in ['BUYER', 'ADVISOR']:
            # Allow any authenticated user to submit requests
            pass
        serializer = InterestRequestCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            req = serializer.save()
            # Notify seller
            notify_user(
                req.seller, 'New Purchase Interest',
                f'{req.buyer_name or req.buyer.username} has expressed interest in "{req.listing.title}".',
                f'/requests', 'info'
            )
            return Response(InterestRequestSerializer(req).data, status=drf_status.HTTP_201_CREATED)
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)


class InterestRequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        req = get_object_or_404(InterestRequest, pk=pk)
        if req.buyer != user and req.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return None, False
        return req, True

    def get(self, request, pk):
        req, ok = self.get_object(pk, request.user)
        if not ok:
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)
        return Response(InterestRequestSerializer(req).data)


class RequestAcceptView(APIView):
    """Seller accepts a request → creates NDA."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        req = get_object_or_404(InterestRequest, pk=pk)
        if req.seller != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        req.status = 'accepted'
        req.seller_response = request.data.get('response', '')
        req.decision_date = timezone.now()
        req.save()

        # Create or fetch NDA
        from apps.nda.models import NDA
        from apps.deals.utils import ensure_deal_for_nda

        seller_also_accepts_nda = request.data.get('accept_nda', False)
        buyer_has_accepted = bool(req.nda_signed)
        buyer_accepted_dt = req.nda_accepted_at if req.nda_signed else None

        nda_status = 'pending'
        if buyer_has_accepted and seller_also_accepts_nda:
            nda_status = 'completed'
        elif buyer_has_accepted:
            nda_status = 'accepted_by_buyer'
        elif seller_also_accepts_nda:
            nda_status = 'accepted_by_seller'

        nda, created = NDA.objects.get_or_create(
            request=req,
            defaults={
                'business': req.listing,
                'buyer': req.buyer,
                'seller': req.seller,
                'buyer_name': req.buyer_name or req.buyer.get_full_name() or req.buyer.username,
                'seller_name': req.seller.get_full_name() or req.seller.username,
                'status': nda_status,
                'buyer_accepted': buyer_has_accepted,
                'buyer_accepted_date': buyer_accepted_dt,
                'seller_accepted': seller_also_accepts_nda,
                'seller_accepted_date': timezone.now() if seller_also_accepts_nda else None,
                'nda_version': req.nda_version or 'VS-NDA v1.0 (2026-10-11)',
                'nda_text': req.nda_document or '',
            }
        )

        deal = None
        if nda.status == 'completed' or (nda.buyer_accepted and nda.seller_accepted):
            deal = ensure_deal_for_nda(nda)

        # Notify buyer
        notify_user(
            req.buyer, 'Request Accepted!',
            f'Your interest in "{req.listing.title}" has been accepted. Please review and acknowledge the NDA.',
            f'/nda/{nda.id}', 'success'
        )

        from apps.nda.serializers import NDASerializer
        res_data = {
            'message': 'Request accepted. NDA ready.',
            'request': InterestRequestSerializer(req).data,
            'nda': NDASerializer(nda).data,
        }
        if deal:
            from apps.deals.serializers import DealSerializer
            res_data['deal'] = DealSerializer(deal, context={'request': request}).data
        return Response(res_data)


class RequestRejectView(APIView):
    """Seller rejects a request."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        req = get_object_or_404(InterestRequest, pk=pk)
        if req.seller != request.user and not (request.user.role.upper() == 'ADMIN' or request.user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        req.status = 'rejected'
        req.seller_response = request.data.get('response', '')
        req.decision_date = timezone.now()
        req.save()

        notify_user(
            req.buyer, 'Request Update',
            f'Your interest request for "{req.listing.title}" was not accepted at this time.',
            '/requests', 'info'
        )
        return Response({'message': 'Request rejected.', 'request': InterestRequestSerializer(req).data})


class SignatureUploadView(APIView):
    """Upload a signature file. Returns file path/id."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('signature')
        if not file:
            return Response({'error': 'No signature file provided.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        import os
        import uuid
        from django.core.files.storage import default_storage
        from django.conf import settings as django_settings
        ext = os.path.splitext(file.name)[1].lower()
        allowed = ['.jpg', '.jpeg', '.png', '.webp']
        if ext not in allowed:
            return Response({'error': 'Signature must be a JPG, JPEG, PNG, or WEBP image.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        unique_name = f"{uuid.uuid4().hex[:12]}_{os.path.basename(file.name)}"
        filename = f"signatures/{request.user.id}_{unique_name}"
        path = default_storage.save(filename, file)
        url = request.build_absolute_uri(django_settings.MEDIA_URL + path)
        return Response({'url': url, 'path': path}, status=drf_status.HTTP_201_CREATED)
