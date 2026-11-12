from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from .models import NDA
from .serializers import NDASerializer
from apps.core.permissions import notify_user


class NDAListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role.upper()
        if role == 'ADMIN' or user.is_staff:
            qs = NDA.objects.all()
        elif role == 'SELLER':
            qs = NDA.objects.filter(seller=user)
        else:
            qs = NDA.objects.filter(buyer=user)
        qs = qs.select_related('business', 'buyer', 'seller').order_by('-created_at')
        return Response(NDASerializer(qs, many=True).data)


class NDADetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        nda = get_object_or_404(NDA, pk=pk)
        if nda.buyer != user and nda.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return None, False
        return nda, True

    def get(self, request, pk):
        nda, ok = self.get_object(pk, request.user)
        if not ok:
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)
        return Response(NDASerializer(nda).data)


class NDAAcknowledgeView(APIView):
    """Buyer or seller acknowledges the NDA. When both have, creates a Deal."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        nda = get_object_or_404(NDA, pk=pk)
        user = request.user

        is_buyer = nda.buyer == user
        is_seller = nda.seller == user
        is_admin = user.role.upper() == 'ADMIN' or user.is_staff

        if not (is_buyer or is_seller or is_admin):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        if is_buyer or (is_admin and not nda.buyer_accepted):
            nda.buyer_accepted = True
            if not nda.buyer_accepted_date:
                nda.buyer_accepted_date = now

        if is_seller or (is_admin and not nda.seller_accepted):
            nda.seller_accepted = True
            if not nda.seller_accepted_date:
                nda.seller_accepted_date = now

        if nda.buyer_accepted and nda.seller_accepted:
            nda.status = 'completed'
        elif nda.buyer_accepted:
            nda.status = 'accepted_by_buyer'
        elif nda.seller_accepted:
            nda.status = 'accepted_by_seller'
        else:
            nda.status = 'pending'

        nda.save()

        deal = None
        if nda.buyer_accepted and nda.seller_accepted:
            from apps.deals.utils import ensure_deal_for_nda
            deal = ensure_deal_for_nda(nda)

        response_data = {'message': 'NDA acknowledged.', 'nda': NDASerializer(nda).data}
        if deal:
            from apps.deals.serializers import DealSerializer
            response_data['deal'] = DealSerializer(deal, context={'request': request}).data

        return Response(response_data)


# ─── Feature 5: Mutual Contact Sharing Views ─────────────────────────────────

from .models import ContactExchange
from .serializers import ContactExchangeSerializer


class ContactExchangeListView(APIView):
    """
    GET: List user's contact exchange records.
    POST: Initiate contact exchange for a mutually acknowledged NDA or active Deal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role.upper()
        if role == 'ADMIN' or user.is_staff:
            qs = ContactExchange.objects.all()
        elif role == 'SELLER':
            qs = ContactExchange.objects.filter(seller=user)
        else:
            qs = ContactExchange.objects.filter(buyer=user)

        qs = qs.select_related('business', 'deal', 'nda', 'buyer', 'seller', 'initiated_by').order_by('-created_at')
        return Response(ContactExchangeSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        deal_id = request.data.get('deal_id')
        nda_id = request.data.get('nda_id')
        if not deal_id and not nda_id:
            return Response({'error': 'Deal ID or NDA ID is required.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        user = request.user

        # Profile Validation: User MUST have both email and phone number to participate
        user_email = (user.email or '').strip()
        user_phone = (getattr(user, 'phone_number', None) or getattr(user, 'phone', None) or '').strip()
        if not user_email or not user_phone:
            missing = []
            if not user_email:
                missing.append('Email Address')
            if not user_phone:
                missing.append('Mobile Number')
            return Response({
                'error': f'Please update your profile with your {" and ".join(missing)} before requesting contact exchange.',
                'missing_profile': True,
                'missing_fields': missing
            }, status=drf_status.HTTP_400_BAD_REQUEST)

        deal = None
        nda = None
        if deal_id:
            from apps.deals.models import Deal
            deal = get_object_or_404(Deal, pk=deal_id)
            nda = deal.nda
            business = deal.business
            buyer = deal.buyer
            seller = deal.seller
        else:
            nda = get_object_or_404(NDA, pk=nda_id)
            deal = getattr(nda, 'deal', None)
            business = nda.business
            buyer = nda.buyer
            seller = nda.seller

        is_buyer = buyer == user
        is_seller = seller == user
        is_admin = user.role.upper() == 'ADMIN' or user.is_staff
        if not (is_buyer or is_seller or is_admin):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        # Contact sharing is ONLY permitted after mutual NDA acknowledgement / active deal
        if nda and not (nda.status == 'completed' or (nda.buyer_accepted and nda.seller_accepted)):
            return Response(
                {'error': 'Mutual contact sharing requires both parties to first acknowledge the NDA.'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        # Auto-link Deal if missing and nda exists
        if not deal and nda:
            from apps.deals.utils import ensure_deal_for_nda
            deal = ensure_deal_for_nda(nda)

        # Check existing active or pending exchange
        lookup = models.Q(nda=nda) if nda else models.Q(deal=deal)
        if deal and nda:
            lookup = models.Q(deal=deal) | models.Q(nda=nda)
        existing = ContactExchange.objects.filter(lookup).order_by('-created_at').first()

        if existing and existing.status == 'pending':
            return Response(
                {
                    'error': 'A contact exchange request is already pending for this deal.',
                    'exchange': ContactExchangeSerializer(existing, context={'request': request}).data
                },
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if existing and existing.status == 'shared':
            return Response(
                {
                    'message': 'Contact details are already mutually shared.',
                    'exchange': ContactExchangeSerializer(existing, context={'request': request}).data
                },
                status=drf_status.HTTP_200_OK
            )

        now = timezone.now()
        exchange = ContactExchange.objects.create(
            business=business,
            deal=deal,
            nda=nda,
            buyer=buyer,
            seller=seller,
            initiated_by=user,
            buyer_consented=True if is_buyer else False,
            buyer_consented_at=now if is_buyer else None,
            seller_consented=True if is_seller else False,
            seller_consented_at=now if is_seller else None,
            status='pending'
        )

        other_user = seller if is_buyer else buyer
        initiator_role = "Buyer" if is_buyer else "Seller"
        business_title = business.name or business.title if business else "Business"
        notify_user(
            other_user,
            'Contact Sharing Request',
            f'{user.get_full_name() or user.username} ({initiator_role}) has requested to exchange direct contact information (Email and Mobile Number) for "{business_title}".',
            f'/deals',
            'info'
        )

        return Response(ContactExchangeSerializer(exchange, context={'request': request}).data, status=drf_status.HTTP_201_CREATED)


class ContactExchangeStatusView(APIView):
    """
    Get the contact exchange state for a specific NDA.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, nda_id):
        nda = get_object_or_404(NDA, pk=nda_id)
        user = request.user
        if nda.buyer != user and nda.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        exchange = ContactExchange.objects.filter(nda=nda).order_by('-created_at').first()
        if not exchange:
            return Response({'status': 'none', 'exchange': None})

        return Response({
            'status': exchange.status,
            'exchange': ContactExchangeSerializer(exchange, context={'request': request}).data
        })


class ContactExchangeByDealView(APIView):
    """
    Get the contact exchange state for a specific Deal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, deal_id):
        from apps.deals.models import Deal
        deal = get_object_or_404(Deal, pk=deal_id)
        user = request.user
        if deal.buyer != user and deal.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

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


class ContactExchangeAcceptView(APIView):
    """
    The second party accepts the contact exchange.
    Both parties' phone numbers and emails become visible to each other.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        exchange = get_object_or_404(ContactExchange, pk=pk)
        user = request.user
        is_buyer = exchange.buyer == user
        is_seller = exchange.seller == user
        is_admin = user.role.upper() == 'ADMIN' or user.is_staff

        if not (is_buyer or is_seller or is_admin):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        # Profile Validation: Accepting user MUST also have both email and phone number
        user_email = (user.email or '').strip()
        user_phone = (getattr(user, 'phone_number', None) or getattr(user, 'phone', None) or '').strip()
        if not user_email or not user_phone:
            missing = []
            if not user_email:
                missing.append('Email Address')
            if not user_phone:
                missing.append('Mobile Number')
            return Response({
                'error': f'Please update your profile with your {" and ".join(missing)} before accepting contact exchange.',
                'missing_profile': True,
                'missing_fields': missing
            }, status=drf_status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if is_buyer or (is_admin and not exchange.buyer_consented):
            exchange.buyer_consented = True
            exchange.buyer_consented_at = now
        if is_seller or (is_admin and not exchange.seller_consented):
            exchange.seller_consented = True
            exchange.seller_consented_at = now

        if exchange.buyer_consented and exchange.seller_consented:
            exchange.status = 'shared'

        exchange.save()

        # Notify the other party
        other_user = exchange.seller if user == exchange.buyer else exchange.buyer
        business_title = exchange.business.name or exchange.business.title if exchange.business else "the business"
        notify_user(
            other_user,
            'Contact Details Shared!',
            f'{user.get_full_name() or user.username} has consented to share direct contact details for "{business_title}". Email address and mobile number are now unlocked.',
            f'/deals',
            'success'
        )

        return Response({
            'message': 'Contact exchange accepted. Details are now mutually visible.',
            'exchange': ContactExchangeSerializer(exchange, context={'request': request}).data
        })


class ContactExchangeDeclineView(APIView):
    """
    Decline a contact exchange request. Contact numbers remain completely confidential.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        exchange = get_object_or_404(ContactExchange, pk=pk)
        user = request.user
        if exchange.buyer != user and exchange.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason', '').strip()
        exchange.status = 'declined'
        exchange.declined_by = user
        exchange.declined_at = timezone.now()
        exchange.decline_reason = reason
        exchange.save()

        other = exchange.seller if user == exchange.buyer else exchange.buyer
        business_title = exchange.business.name or exchange.business.title if exchange.business else "the business"
        notify_user(
            other,
            'Contact Sharing Declined',
            f'{user.get_full_name() or user.username} has declined the contact exchange request for "{business_title}". Direct contact numbers remain confidential.',
            f'/deals',
            'info'
        )

        return Response({
            'message': 'Contact sharing declined. Phone numbers remain confidential.',
            'exchange': ContactExchangeSerializer(exchange, context={'request': request}).data
        })


class ContactExchangeCancelView(APIView):
    """
    Initiator cancels their pending contact exchange request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        exchange = get_object_or_404(ContactExchange, pk=pk)
        user = request.user
        if exchange.initiated_by != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Only the initiator can cancel this request.'}, status=drf_status.HTTP_403_FORBIDDEN)

        exchange.status = 'cancelled'
        exchange.save()
        return Response({
            'message': 'Contact exchange request cancelled.',
            'exchange': ContactExchangeSerializer(exchange, context={'request': request}).data
        })
