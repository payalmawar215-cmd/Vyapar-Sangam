from rest_framework import serializers
from django.utils import timezone
from .models import Meeting, MeetingStatusHistory
from apps.nda.models import NDA
from apps.deals.models import Deal
from apps.deals.utils import ensure_deal_for_nda


class MeetingStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MeetingStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_by_name', 'note', 'created_at']

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return 'System'
        return obj.changed_by.get_full_name() or obj.changed_by.username


class MeetingSerializer(serializers.ModelSerializer):
    business_id = serializers.IntegerField(source='business.id', read_only=True)
    business_title = serializers.SerializerMethodField()
    business_city = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    deal_id = serializers.IntegerField(source='deal.id', read_only=True)
    deal_title = serializers.SerializerMethodField()
    deal_status = serializers.SerializerMethodField()
    is_buyer = serializers.SerializerMethodField()
    is_seller = serializers.SerializerMethodField()
    status_history = MeetingStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Meeting
        fields = [
            'id', 'deal', 'deal_id', 'deal_title', 'deal_status',
            'business', 'business_id', 'business_title', 'business_city',
            'nda', 'request',
            'buyer', 'buyer_name',
            'seller', 'seller_name',
            'created_by', 'created_by_name',
            'meeting_type', 'status', 'status_history',
            'preferred_date', 'preferred_time',
            'alternative_date', 'alternative_time',
            'purpose',
            'online_meeting_link', 'site_visit_location',
            'reschedule_date', 'reschedule_time', 'reschedule_reason',
            'rejection_reason', 'cancelled_by', 'cancellation_reason',
            'confirmed_date', 'confirmed_time',
            'is_buyer', 'is_seller',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'deal', 'business', 'buyer', 'seller', 'created_by',
            'status', 'created_at', 'updated_at'
        ]

    def get_business_title(self, obj):
        return obj.business.name or obj.business.title if obj.business else ''

    def get_business_city(self, obj):
        return obj.business.city if obj.business else ''

    def get_buyer_name(self, obj):
        return obj.buyer.get_full_name() or obj.buyer.username if obj.buyer else ''

    def get_seller_name(self, obj):
        return obj.seller.get_full_name() or obj.seller.username if obj.seller else ''

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username if obj.created_by else ''

    def get_deal_title(self, obj):
        if obj.deal and obj.deal.business:
            return obj.deal.business.name or obj.deal.business.title
        return ''

    def get_deal_status(self, obj):
        return obj.deal.status if obj.deal else ''

    def get_is_buyer(self, obj):
        request = self.context.get('request')
        return request.user == obj.buyer if request and request.user.is_authenticated else False

    def get_is_seller(self, obj):
        request = self.context.get('request')
        return request.user == obj.seller if request and request.user.is_authenticated else False


class MeetingCreateSerializer(serializers.ModelSerializer):
    deal_id = serializers.IntegerField(write_only=True, required=False)
    nda_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Meeting
        fields = [
            'deal_id', 'nda_id', 'meeting_type',
            'preferred_date', 'preferred_time',
            'alternative_date', 'alternative_time',
            'purpose', 'online_meeting_link', 'site_visit_location'
        ]

    def validate(self, data):
        user = self.context['request'].user
        deal_id = data.pop('deal_id', None)
        nda_id = data.pop('nda_id', None)

        if not deal_id and not nda_id:
            raise serializers.ValidationError('Either a deal_id or an nda_id is required.')

        deal = None
        nda = None

        if deal_id:
            try:
                deal = Deal.objects.select_related('business', 'buyer', 'seller', 'request', 'nda').get(pk=deal_id)
            except Deal.DoesNotExist:
                raise serializers.ValidationError({'deal_id': 'Valid Deal record not found.'})

            if deal.buyer != user and deal.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
                raise serializers.ValidationError({'deal_id': 'You are not a participant in this deal.'})

            if deal.status in ['deal_cancelled', 'cancelled']:
                raise serializers.ValidationError({'deal_id': 'Meetings cannot be scheduled for cancelled deals.'})

            nda = deal.nda
            if not nda:
                # Find matching completed NDA if any
                nda = NDA.objects.filter(business=deal.business, buyer=deal.buyer, seller=deal.seller).first()
                if nda:
                    deal.nda = nda
                    deal.save(update_fields=['nda'])

        elif nda_id:
            try:
                nda = NDA.objects.select_related('business', 'buyer', 'seller', 'request').get(pk=nda_id)
            except NDA.DoesNotExist:
                raise serializers.ValidationError({'nda_id': 'Valid Non-Disclosure Agreement not found.'})

            if nda.buyer != user and nda.seller != user and not (user.role.upper() == 'ADMIN' or user.is_staff):
                raise serializers.ValidationError({'nda_id': 'You are not a participant in this agreement.'})

            if not (nda.status == 'completed' or (nda.buyer_accepted and nda.seller_accepted)):
                raise serializers.ValidationError(
                    {'nda': 'Meetings and site visits can only be scheduled after both parties have acknowledged the NDA.'}
                )

            deal = getattr(nda, 'deal', None) or Deal.objects.filter(nda=nda).first()
            if not deal:
                deal = ensure_deal_for_nda(nda)

        if not deal:
            raise serializers.ValidationError('Every meeting must be linked to a valid active Deal.')

        # Date validation: no past dates
        pref_date = data.get('preferred_date')
        if pref_date and pref_date < timezone.now().date():
            raise serializers.ValidationError({'preferred_date': 'Preferred meeting date cannot be in the past.'})

        alt_date = data.get('alternative_date')
        if alt_date and alt_date < timezone.now().date():
            raise serializers.ValidationError({'alternative_date': 'Alternative meeting date cannot be in the past.'})

        # Prevent duplicate pending meeting requests for the same deal
        pending_meeting = Meeting.objects.filter(
            deal=deal,
            status__in=['requested', 'reschedule_proposed']
        ).first()
        if pending_meeting:
            raise serializers.ValidationError(
                f'A meeting request is already pending for this deal (Meeting #{pending_meeting.id}). Please respond to or resolve it first.'
            )

        data['deal'] = deal
        data['nda'] = nda or deal.nda
        data['business'] = deal.business
        data['buyer'] = deal.buyer
        data['seller'] = deal.seller
        data['request'] = deal.request
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data['status'] = Meeting.MeetingStatus.REQUESTED
        meeting = super().create(validated_data)

        # Log initial status history
        MeetingStatusHistory.objects.create(
            meeting=meeting,
            from_status='',
            to_status=Meeting.MeetingStatus.REQUESTED,
            changed_by=user,
            note=meeting.purpose or 'Meeting requested.'
        )

        return meeting
