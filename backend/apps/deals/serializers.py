from rest_framework import serializers
from .models import Deal, DealStatusHistory


class DealStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DealStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by', 'changed_by_name', 'note', 'created_at']

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return 'System'
        return obj.changed_by.get_full_name() or obj.changed_by.username


class DealSerializer(serializers.ModelSerializer):
    business_id = serializers.IntegerField(source='business.id', read_only=True)
    business = serializers.SerializerMethodField()
    business_title = serializers.SerializerMethodField()
    business_asking_price = serializers.SerializerMethodField()
    business_featured_image = serializers.SerializerMethodField()
    buyer_username = serializers.SerializerMethodField()
    seller_username = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    status_history = DealStatusHistorySerializer(many=True, read_only=True)
    is_buyer = serializers.SerializerMethodField()
    is_seller = serializers.SerializerMethodField()
    meeting_count = serializers.SerializerMethodField()
    contact_exchange = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            'id', 'business', 'business_id', 'business_title', 'business_asking_price', 'business_featured_image',
            'nda', 'request',
            'buyer', 'buyer_username', 'buyer_name',
            'seller', 'seller_username', 'seller_name',
            'status', 'status_display', 'status_history',
            'notes', 'deal_value', 'closed_at',
            'is_buyer', 'is_seller', 'meeting_count', 'contact_exchange',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'business', 'business_id', 'nda', 'request',
            'buyer', 'seller', 'buyer_name', 'seller_name',
            'created_at', 'updated_at'
        ]

    def get_business_title(self, obj):
        return obj.business.name or obj.business.title if obj.business else ''

    def get_business_asking_price(self, obj):
        return str(obj.business.asking_price) if obj.business and obj.business.asking_price else ''

    def get_business_featured_image(self, obj):
        if not obj.business:
            return None
        return obj.business.featured_image or (obj.business.images[0] if obj.business.images else None)

    def get_buyer_username(self, obj):
        return obj.buyer.username if obj.buyer else None

    def get_seller_username(self, obj):
        return obj.seller.username if obj.seller else None

    def get_status_display(self, obj):
        return dict(Deal.DealStatus.choices).get(obj.status, obj.status.replace('_', ' ').title())

    def get_is_buyer(self, obj):
        request = self.context.get('request')
        return request.user == obj.buyer if request and request.user.is_authenticated else False

    def get_is_seller(self, obj):
        request = self.context.get('request')
        return request.user == obj.seller if request and request.user.is_authenticated else False

    def get_meeting_count(self, obj):
        return obj.meetings.count() if hasattr(obj, 'meetings') else 0

    def get_contact_exchange(self, obj):
        from django.db.models import Q
        from apps.nda.models import ContactExchange
        from apps.nda.serializers import ContactExchangeSerializer

        lookup = Q(deal=obj)
        if obj.nda:
            lookup = lookup | Q(nda=obj.nda)
        exchange = ContactExchange.objects.filter(lookup).order_by('-created_at').first()
        if not exchange:
            return None
        return ContactExchangeSerializer(exchange, context=self.context).data

    def get_business(self, obj):
        if not obj.business:
            return None
        return {
            'id': obj.business.id,
            'name': obj.business.name or obj.business.title,
            'category': obj.business.category.name if obj.business.category else '',
            'city': obj.business.city,
            'state': obj.business.state,
            'asking_price': obj.business.asking_price,
            'featured_image': obj.business.featured_image or (obj.business.images[0] if obj.business.images else None),
        }
