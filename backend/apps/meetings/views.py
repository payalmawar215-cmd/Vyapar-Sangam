from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
from .models import Meeting, MeetingStatusHistory
from .serializers import MeetingSerializer, MeetingCreateSerializer
from apps.deals.models import Deal, DealStatusHistory
from apps.core.permissions import notify_user


class MeetingListView(APIView):
    """
    GET: List user's meetings (buyer, seller, or admin).
    POST: Create a meeting request linked to an active deal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role.upper() if user.role else 'BUYER'
        as_role = request.GET.get('as')

        if role == 'ADMIN' or user.is_staff:
            qs = Meeting.objects.all()
        elif as_role == 'seller':
            qs = Meeting.objects.filter(seller=user)
        elif as_role == 'buyer':
            qs = Meeting.objects.filter(buyer=user)
        else:
            qs = Meeting.objects.filter(models.Q(buyer=user) | models.Q(seller=user))

        deal_id = request.GET.get('deal') or request.GET.get('deal_id')
        if deal_id:
            qs = qs.filter(deal_id=deal_id)

        nda_id = request.GET.get('nda') or request.GET.get('nda_id')
        if nda_id:
            qs = qs.filter(nda_id=nda_id)

        business_id = request.GET.get('business')
        if business_id:
            qs = qs.filter(business_id=business_id)

        stat = request.GET.get('status')
        if stat:
            if stat == 'confirmed':
                qs = qs.filter(status__in=['confirmed', 'accepted', 'rescheduled'])
            else:
                qs = qs.filter(status=stat)

        qs = qs.select_related('business', 'buyer', 'seller', 'created_by', 'nda', 'deal')\
               .prefetch_related('status_history')\
               .order_by('-created_at')

        return Response(MeetingSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        serializer = MeetingCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            meeting = serializer.save()

            # If deal is currently nda_completed, update to meeting_scheduled
            if meeting.deal and meeting.deal.status in ['nda_completed', 'discussion', 'discussion_in_progress']:
                old_status = meeting.deal.status
                meeting.deal.status = 'meeting_scheduled'
                meeting.deal.save(update_fields=['status'])
                DealStatusHistory.objects.create(
                    deal=meeting.deal,
                    from_status=old_status,
                    to_status='meeting_scheduled',
                    changed_by=request.user,
                    note=f'Meeting requested by {request.user.get_full_name() or request.user.username}.'
                )

            other_user = meeting.seller if request.user == meeting.buyer else meeting.buyer
            user_title = "Buyer" if request.user == meeting.buyer else "Seller"
            notify_user(
                other_user,
                'New Meeting Request',
                f'{request.user.get_full_name() or request.user.username} ({user_title}) requested a {meeting.get_meeting_type_display()} for "{meeting.business.title}".',
                '/meetings',
                'info'
            )
            return Response(MeetingSerializer(meeting, context={'request': request}).data, status=drf_status.HTTP_201_CREATED)
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)


class EligibleDealsView(APIView):
    """
    Returns active deals for the authenticated user that are eligible for meeting scheduling.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role.upper() if user.role else 'BUYER'

        if role == 'ADMIN' or user.is_staff:
            qs = Deal.objects.exclude(status__in=['deal_cancelled', 'cancelled'])
        else:
            qs = Deal.objects.filter(models.Q(buyer=user) | models.Q(seller=user))\
                             .exclude(status__in=['deal_cancelled', 'cancelled'])

        qs = qs.select_related('business', 'buyer', 'seller', 'nda').order_by('-created_at')

        results = []
        for d in qs:
            is_buyer = d.buyer == user
            counterpart = d.seller if is_buyer else d.buyer
            counterpart_name = counterpart.get_full_name() or counterpart.username if counterpart else ''
            results.append({
                'id': d.id,
                'deal_id': d.id,
                'business_id': d.business.id if d.business else None,
                'business_title': d.business.name or d.business.title if d.business else 'Business',
                'business_city': d.business.city if d.business else '',
                'asking_price': str(d.business.asking_price) if d.business and d.business.asking_price else '',
                'counterpart_name': counterpart_name,
                'counterpart_role': 'Seller' if is_buyer else 'Buyer',
                'status': d.status,
                'status_display': d.get_status_display(),
                'nda_id': d.nda.id if d.nda else None,
            })

        return Response(results)


class MeetingDetailView(APIView):
    """View details of a single meeting request."""
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        meeting = get_object_or_404(Meeting.objects.select_related('business', 'buyer', 'seller', 'deal', 'nda'), pk=pk)
        if meeting.buyer != user and meeting.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return None, False
        return meeting, True

    def get(self, request, pk):
        meeting, ok = self.get_object(pk, request.user)
        if not ok:
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)
        return Response(MeetingSerializer(meeting, context={'request': request}).data)


class MeetingAcceptView(APIView):
    """
    Seller: Accept a meeting request.
    Can confirm preferred date or alternative date, and supply meeting link / physical address.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        meeting = get_object_or_404(Meeting.objects.select_related('business', 'buyer', 'seller', 'deal'), pk=pk)
        user = request.user
        if meeting.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Only the seller can accept incoming meeting requests.'}, status=drf_status.HTTP_403_FORBIDDEN)

        use_alternative = request.data.get('use_alternative', False)
        if use_alternative and meeting.alternative_date and meeting.alternative_time:
            meeting.confirmed_date = meeting.alternative_date
            meeting.confirmed_time = meeting.alternative_time
        else:
            meeting.confirmed_date = meeting.preferred_date
            meeting.confirmed_time = meeting.preferred_time

        meeting.online_meeting_link = request.data.get('online_meeting_link', meeting.online_meeting_link)
        meeting.site_visit_location = request.data.get('site_visit_location', meeting.site_visit_location)
        old_status = meeting.status
        meeting.status = 'confirmed'
        meeting.save()

        seller_message = request.data.get('message', '').strip()
        MeetingStatusHistory.objects.create(
            meeting=meeting,
            from_status=old_status,
            to_status='confirmed',
            changed_by=user,
            note=seller_message or f'Accepted and confirmed for {meeting.confirmed_date} at {meeting.confirmed_time}.'
        )

        # Update deal status to meeting_scheduled if deal exists
        if meeting.deal and meeting.deal.status in ['nda_completed', 'discussion', 'discussion_in_progress']:
            old_deal_status = meeting.deal.status
            meeting.deal.status = 'meeting_scheduled'
            meeting.deal.save(update_fields=['status'])
            DealStatusHistory.objects.create(
                deal=meeting.deal,
                from_status=old_deal_status,
                to_status='meeting_scheduled',
                changed_by=user,
                note='Meeting accepted and confirmed.'
            )

        notify_user(
            meeting.buyer,
            'Meeting Confirmed!',
            f'Seller has confirmed your meeting for "{meeting.business.title}" on {meeting.confirmed_date} at {meeting.confirmed_time}.',
            '/meetings',
            'success'
        )

        return Response({
            'message': 'Meeting accepted and confirmed.',
            'meeting': MeetingSerializer(meeting, context={'request': request}).data
        })


class MeetingRejectView(APIView):
    """Seller: Reject a meeting request."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        meeting = get_object_or_404(Meeting.objects.select_related('business', 'buyer', 'seller'), pk=pk)
        user = request.user
        if meeting.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Only the seller can reject this meeting request.'}, status=drf_status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason', 'Seller is unavailable at the requested times.').strip()
        old_status = meeting.status
        meeting.rejection_reason = reason
        meeting.status = 'rejected'
        meeting.save()

        MeetingStatusHistory.objects.create(
            meeting=meeting,
            from_status=old_status,
            to_status='rejected',
            changed_by=user,
            note=reason
        )

        notify_user(
            meeting.buyer,
            'Meeting Request Declined',
            f'Meeting request for "{meeting.business.title}" was declined: {reason}',
            '/meetings',
            'info'
        )

        return Response({
            'message': 'Meeting rejected.',
            'meeting': MeetingSerializer(meeting, context={'request': request}).data
        })


class MeetingProposeRescheduleView(APIView):
    """
    Seller: Propose an alternative meeting date/time with a note.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        meeting = get_object_or_404(Meeting.objects.select_related('business', 'buyer', 'seller'), pk=pk)
        user = request.user
        if meeting.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Only the seller can propose a reschedule.'}, status=drf_status.HTTP_403_FORBIDDEN)

        reschedule_date = request.data.get('reschedule_date')
        reschedule_time = request.data.get('reschedule_time')
        reason = request.data.get('reason', '').strip() or request.data.get('reschedule_reason', '').strip()

        if not reschedule_date or not reschedule_time:
            return Response({'error': 'Both reschedule date and time are required.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        old_status = meeting.status
        meeting.reschedule_date = reschedule_date
        meeting.reschedule_time = reschedule_time
        meeting.reschedule_reason = reason
        meeting.status = 'reschedule_proposed'
        meeting.save()

        MeetingStatusHistory.objects.create(
            meeting=meeting,
            from_status=old_status,
            to_status='reschedule_proposed',
            changed_by=user,
            note=f'Reschedule proposed for {reschedule_date} at {reschedule_time}. {reason}'.strip()
        )

        notify_user(
            meeting.buyer,
            'Reschedule Proposed',
            f'Seller proposed a new time for "{meeting.business.title}" meeting: {reschedule_date} at {reschedule_time}.',
            '/meetings',
            'info'
        )

        return Response({
            'message': 'Reschedule proposed to buyer.',
            'meeting': MeetingSerializer(meeting, context={'request': request}).data
        })


class MeetingAcceptRescheduleView(APIView):
    """
    Buyer: Accept the seller's proposed reschedule slot.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        meeting = get_object_or_404(Meeting.objects.select_related('business', 'buyer', 'seller', 'deal'), pk=pk)
        user = request.user
        if meeting.buyer != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Only the buyer can accept the proposed reschedule.'}, status=drf_status.HTTP_403_FORBIDDEN)

        if not meeting.reschedule_date or not meeting.reschedule_time:
            return Response({'error': 'No reschedule slot has been proposed.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        old_status = meeting.status
        meeting.confirmed_date = meeting.reschedule_date
        meeting.confirmed_time = meeting.reschedule_time
        meeting.status = 'rescheduled'
        meeting.save()

        MeetingStatusHistory.objects.create(
            meeting=meeting,
            from_status=old_status,
            to_status='rescheduled',
            changed_by=user,
            note=f'Accepted rescheduled slot: {meeting.confirmed_date} at {meeting.confirmed_time}.'
        )

        if meeting.deal and meeting.deal.status in ['nda_completed', 'discussion', 'discussion_in_progress']:
            meeting.deal.status = 'meeting_scheduled'
            meeting.deal.save(update_fields=['status'])

        notify_user(
            meeting.seller,
            'Reschedule Accepted!',
            f'Buyer accepted your proposed meeting time for "{meeting.business.title}": {meeting.confirmed_date} at {meeting.confirmed_time}.',
            '/meetings',
            'success'
        )

        return Response({
            'message': 'Rescheduled meeting confirmed.',
            'meeting': MeetingSerializer(meeting, context={'request': request}).data
        })


class MeetingCancelView(APIView):
    """
    Buyer or Seller: Cancel a meeting request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        meeting = get_object_or_404(Meeting.objects.select_related('business', 'buyer', 'seller'), pk=pk)
        user = request.user
        if meeting.buyer != user and meeting.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        reason = request.data.get('reason', '').strip()
        old_status = meeting.status
        meeting.cancelled_by = user
        meeting.cancellation_reason = reason
        meeting.status = 'cancelled'
        meeting.save()

        MeetingStatusHistory.objects.create(
            meeting=meeting,
            from_status=old_status,
            to_status='cancelled',
            changed_by=user,
            note=reason or 'Meeting cancelled.'
        )

        other = meeting.seller if user == meeting.buyer else meeting.buyer
        notify_user(
            other,
            'Meeting Cancelled',
            f'Meeting for "{meeting.business.title}" was cancelled by {user.get_full_name() or user.username}.',
            '/meetings',
            'error'
        )

        return Response({
            'message': 'Meeting cancelled.',
            'meeting': MeetingSerializer(meeting, context={'request': request}).data
        })


class MeetingCompleteView(APIView):
    """
    Mark a meeting as completed.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        meeting = get_object_or_404(Meeting.objects.select_related('business', 'buyer', 'seller'), pk=pk)
        user = request.user
        if meeting.buyer != user and meeting.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
            return Response({'error': 'Permission denied.'}, status=drf_status.HTTP_403_FORBIDDEN)

        old_status = meeting.status
        meeting.status = 'completed'
        meeting.save()

        MeetingStatusHistory.objects.create(
            meeting=meeting,
            from_status=old_status,
            to_status='completed',
            changed_by=user,
            note='Meeting marked as completed.'
        )

        return Response({
            'message': 'Meeting marked as completed.',
            'meeting': MeetingSerializer(meeting, context={'request': request}).data
        })
