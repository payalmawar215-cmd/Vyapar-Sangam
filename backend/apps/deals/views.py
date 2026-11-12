from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
from .models import Deal, DealStatusHistory
from .serializers import DealSerializer
from .utils import ensure_deal_for_nda
from apps.core.permissions import notify_user
from apps.nda.models import NDA


class DealListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role.upper() if user.role else 'BUYER'

        # Auto-heal: Ensure any completed NDAs for this user have their deals created
        if role == 'ADMIN' or user.is_staff:
            completed_ndas = NDA.objects.filter(buyer_accepted=True, seller_accepted=True, deal__isnull=True)
        else:
            completed_ndas = NDA.objects.filter(
                models.Q(buyer=user) | models.Q(seller=user),
                buyer_accepted=True,
                seller_accepted=True,
                deal__isnull=True
            )
        for nda in completed_ndas:
            ensure_deal_for_nda(nda)

        as_role = request.GET.get('as')  # 'seller' or 'buyer'
        status_filter = request.GET.get('status')

        if role == 'ADMIN' or user.is_staff:
            qs = Deal.objects.all()
        elif as_role == 'seller':
            qs = Deal.objects.filter(seller=user)
        elif as_role == 'buyer':
            qs = Deal.objects.filter(buyer=user)
        else:
            qs = Deal.objects.filter(models.Q(buyer=user) | models.Q(seller=user))

        if status_filter:
            qs = qs.filter(status=status_filter)

        qs = qs.select_related('business', 'buyer', 'seller', 'nda', 'request').prefetch_related('status_history').order_by('-created_at')
        return Response(DealSerializer(qs, many=True, context={'request': request}).data)


class DealDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        deal = get_object_or_404(Deal, pk=pk)
        if deal.buyer != user and deal.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return None, False
        return deal, True

    def get(self, request, pk):
        deal, ok = self.get_object(pk, request.user)
        if not ok:
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)
        return Response(DealSerializer(deal, context={'request': request}).data)

    def patch(self, request, pk):
        deal, ok = self.get_object(pk, request.user)
        if not ok:
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        user = request.user
        new_status = request.data.get('status')
        status_note = request.data.get('note', '').strip()

        # Validate status change if provided
        if new_status and new_status != deal.status:
            valid_statuses = [c[0] for c in Deal.DealStatus.choices]
            if new_status not in valid_statuses:
                return Response({'error': f'Invalid status. Allowed choices: {valid_statuses}'}, status=drf_status.HTTP_400_BAD_REQUEST)

            old_status = deal.status
            deal.status = new_status
            if new_status in ['deal_closed', 'completed'] and not deal.closed_at:
                deal.closed_at = timezone.now()

            DealStatusHistory.objects.create(
                deal=deal,
                from_status=old_status,
                to_status=new_status,
                changed_by=user,
                note=status_note or f'Status updated to {deal.get_status_display()}'
            )

            # Notify the counterpart
            other_user = deal.seller if user == deal.buyer else deal.buyer
            user_title = "Buyer" if user == deal.buyer else "Seller"
            notify_user(
                other_user,
                'Deal Status Updated',
                f'{user_title} updated deal status for "{deal.business.title}" to "{deal.get_status_display()}".',
                '/deals',
                'info'
            )

        if 'notes' in request.data:
            deal.notes = request.data['notes']
        if 'deal_value' in request.data and request.data['deal_value']:
            try:
                deal.deal_value = request.data['deal_value']
            except Exception:
                pass

        deal.save()
        return Response(DealSerializer(deal, context={'request': request}).data)

    def put(self, request, pk):
        return self.patch(request, pk)


class DealContactExchangeView(APIView):
    """
    Get or initiate mutual contact exchange for a deal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        deal = get_object_or_404(Deal, pk=pk)
        user = request.user
        if deal.buyer != user and deal.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        from apps.nda.models import ContactExchange
        from apps.nda.serializers import ContactExchangeSerializer

        lookup = models.Q(deal=deal)
        if deal.nda:
            lookup = lookup | models.Q(nda=deal.nda)
        exchange = ContactExchange.objects.filter(lookup).order_by('-created_at').first()
        if not exchange:
            return Response({'status': 'none', 'exchange': None})

        return Response({
            'status': exchange.status,
            'exchange': ContactExchangeSerializer(exchange, context={'request': request}).data
        })

    def post(self, request, pk):
        from apps.nda.views import ContactExchangeListView
        request.data['deal_id'] = pk
        view = ContactExchangeListView.as_view()
        return view(request._request)
