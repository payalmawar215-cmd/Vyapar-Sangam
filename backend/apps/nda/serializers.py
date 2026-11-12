from rest_framework import serializers
from .models import NDA, ContactExchange


class NDASerializer(serializers.ModelSerializer):
    business_id = serializers.IntegerField(source='business.id', read_only=True)
    business = serializers.SerializerMethodField()
    business_title = serializers.SerializerMethodField()
    business_asking_price = serializers.SerializerMethodField()
    business_featured_image = serializers.SerializerMethodField()
    buyer_username = serializers.SerializerMethodField()
    seller_username = serializers.SerializerMethodField()

    class Meta:
        model = NDA
        fields = [
            'id', 'request', 'business', 'business_id', 'business_title', 'business_asking_price', 'business_featured_image',
            'buyer', 'buyer_username', 'buyer_name',
            'seller', 'seller_username', 'seller_name',
            'status', 'buyer_accepted', 'seller_accepted',
            'buyer_accepted_date', 'seller_accepted_date',
            'nda_version', 'nda_text', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'seller', 'business', 'business_id', 'request', 'created_at', 'updated_at']

    def get_business_title(self, obj):
        return obj.business.name or obj.business.title

    def get_business_asking_price(self, obj):
        return str(obj.business.asking_price)

    def get_business_featured_image(self, obj):
        return obj.business.featured_image or (obj.business.images[0] if obj.business.images else None)

    def get_buyer_username(self, obj):
        return obj.buyer.username if obj.buyer else None

    def get_seller_username(self, obj):
        return obj.seller.username if obj.seller else None

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


class ContactExchangeSerializer(serializers.ModelSerializer):
    deal_id = serializers.IntegerField(source='deal.id', read_only=True)
    business_title = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    initiated_by_name = serializers.SerializerMethodField()
    requester_name = serializers.SerializerMethodField()
    declined_by_name = serializers.SerializerMethodField()
    contact_details = serializers.SerializerMethodField()
    is_initiator = serializers.SerializerMethodField()
    user_has_consented = serializers.SerializerMethodField()

    class Meta:
        model = ContactExchange
        fields = [
            'id', 'deal', 'deal_id', 'business', 'business_title', 'nda',
            'buyer', 'buyer_name',
            'seller', 'seller_name',
            'initiated_by', 'initiated_by_name', 'requester_name',
            'buyer_consented', 'buyer_consented_at',
            'seller_consented', 'seller_consented_at',
            'status',
            'declined_by', 'declined_by_name', 'declined_at', 'decline_reason',
            'contact_details', 'is_initiator', 'user_has_consented',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'deal', 'deal_id', 'business', 'nda', 'buyer', 'seller', 'initiated_by',
            'buyer_consented', 'buyer_consented_at',
            'seller_consented', 'seller_consented_at',
            'status', 'declined_by', 'declined_at',
            'created_at', 'updated_at'
        ]

    def get_business_title(self, obj):
        return obj.business.name or obj.business.title

    def get_buyer_name(self, obj):
        return obj.buyer.get_full_name() or obj.buyer.username

    def get_seller_name(self, obj):
        return obj.seller.get_full_name() or obj.seller.username

    def get_initiated_by_name(self, obj):
        return obj.initiated_by.get_full_name() or obj.initiated_by.username

    def get_requester_name(self, obj):
        return obj.initiated_by.get_full_name() or obj.initiated_by.username

    def get_declined_by_name(self, obj):
        if not obj.declined_by:
            return None
        return obj.declined_by.get_full_name() or obj.declined_by.username

    def get_is_initiator(self, obj):
        request = self.context.get('request')
        return request.user == obj.initiated_by if request and request.user.is_authenticated else False

    def get_user_has_consented(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user == obj.buyer:
            return obj.buyer_consented
        if request.user == obj.seller:
            return obj.seller_consented
        return False

    def get_contact_details(self, obj):
        """
        SECURITY REQUIREMENT:
        Contact details (phone and email) are ONLY revealed when BOTH buyer and seller
        have explicitly consented AND the requesting user is either the buyer or seller.
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        user = request.user
        is_participant = user == obj.buyer or user == obj.seller or (user.role.upper() == 'ADMIN' or user.is_staff)
        is_mutually_shared = obj.status == 'shared' and obj.buyer_consented and obj.seller_consented

        if not (is_participant and is_mutually_shared):
            return None

        # Fetch phone numbers from User models or request snapshot
        buyer_phone = getattr(obj.buyer, 'phone', None) or getattr(obj.buyer, 'phone_number', '')
        if not buyer_phone and hasattr(obj.nda, 'request') and obj.nda.request:
            buyer_phone = getattr(obj.nda.request, 'buyer_phone', '')

        seller_phone = getattr(obj.seller, 'phone', None) or getattr(obj.seller, 'phone_number', '')

        buyer_name = (
            (obj.nda.buyer_name if hasattr(obj, 'nda') and obj.nda and obj.nda.buyer_name else '')
            or getattr(obj.buyer, 'full_name', None)
            or obj.buyer.get_full_name()
            or obj.buyer.username
        )
        seller_name = (
            (obj.nda.seller_name if hasattr(obj, 'nda') and obj.nda and obj.nda.seller_name else '')
            or getattr(obj.seller, 'full_name', None)
            or obj.seller.get_full_name()
            or obj.seller.username
        )

        return {
            'buyer': {
                'name': buyer_name,
                'phone': buyer_phone or 'Not specified',
                'email': obj.buyer.email,
            },
            'seller': {
                'name': seller_name,
                'phone': seller_phone or 'Not specified',
                'email': obj.seller.email,
            }
        }

