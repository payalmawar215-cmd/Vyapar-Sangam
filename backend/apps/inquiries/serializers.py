from rest_framework import serializers
from .models import InterestRequest, Inquiry
from apps.listings.models import BusinessListing


class InterestRequestSerializer(serializers.ModelSerializer):
    listing_title = serializers.SerializerMethodField()
    listing_asking_price = serializers.SerializerMethodField()
    listing_featured_image = serializers.SerializerMethodField()
    buyer_username = serializers.SerializerMethodField()
    seller_username = serializers.SerializerMethodField()
    has_nda = serializers.SerializerMethodField()
    business_id = serializers.IntegerField(source='listing.id', read_only=True)
    business = serializers.SerializerMethodField()
    signature_file_url = serializers.SerializerMethodField()

    class Meta:
        model = InterestRequest
        fields = [
            'id', 'listing', 'business_id', 'business', 'listing_title', 'listing_asking_price', 'listing_featured_image',
            'buyer', 'buyer_username', 'buyer_name', 'buyer_email', 'buyer_phone',
            'seller', 'seller_username',
            'request_type', 'status',
            'purpose', 'message',
            'nda_version', 'nda_document', 'nda_signed', 'nda_accepted_at',
            'signature_file', 'signature_file_url',
            'seller_response', 'decision_date',
            'has_nda', 'email_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'seller', 'status', 'decision_date', 'created_at', 'updated_at']

    def get_listing_title(self, obj):
        return obj.listing.title

    def get_listing_asking_price(self, obj):
        return str(obj.listing.asking_price)

    def get_listing_featured_image(self, obj):
        return obj.listing.featured_image or (obj.listing.images[0] if obj.listing.images else None)

    def get_buyer_username(self, obj):
        return obj.buyer.username if obj.buyer else None

    def get_seller_username(self, obj):
        return obj.seller.username if obj.seller else None

    def get_has_nda(self, obj):
        return hasattr(obj, 'nda') and obj.nda is not None

    def get_signature_file_url(self, obj):
        if obj.signature_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.signature_file.url)
            return obj.signature_file.url
        return None

    def get_business(self, obj):
        if not obj.listing:
            return None
        return {
            'id': obj.listing.id,
            'name': obj.listing.name or obj.listing.title,
            'category': obj.listing.category.name if obj.listing.category else '',
            'city': obj.listing.city,
            'state': obj.listing.state,
            'asking_price': obj.listing.asking_price,
            'featured_image': obj.listing.featured_image or (obj.listing.images[0] if obj.listing.images else None),
        }


class SignatureFileField(serializers.Field):
    """
    Accepts either an uploaded file or a URL / storage path string.
    """
    def to_internal_value(self, data):
        if not data:
            return None
        if hasattr(data, 'read'):
            return data
        if isinstance(data, str):
            val = data.strip()
            if not val:
                return None
            from django.conf import settings
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            if media_url in val:
                val = val.split(media_url, 1)[1]
            return val
        return None

    def to_representation(self, value):
        if not value:
            return None
        if hasattr(value, 'url'):
            return value.url
        return str(value)


class InterestRequestCreateSerializer(serializers.ModelSerializer):
    business_id = serializers.IntegerField(write_only=True, required=False)
    listing_id = serializers.IntegerField(write_only=True, required=False)
    signature_file = SignatureFileField(required=False, allow_null=True)
    nda_version = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nda_accepted_at = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = InterestRequest
        fields = [
            'listing', 'business_id', 'listing_id', 'request_type',
            'buyer_name', 'buyer_email', 'buyer_phone',
            'purpose', 'message',
            'nda_version', 'nda_document', 'nda_signed', 'nda_accepted_at',
            'signature_file',
        ]
        extra_kwargs = {
            'listing': {'required': False}
        }

    def validate(self, data):
        # Support business_id and listing_id as alias for listing
        listing_id = data.pop('listing_id', None) or data.pop('business_id', None)
        if listing_id and 'listing' not in data:
            try:
                data['listing'] = BusinessListing.objects.get(id=listing_id)
            except BusinessListing.DoesNotExist:
                raise serializers.ValidationError({'listing': f'Business listing with ID {listing_id} does not exist.'})
        elif 'listing' not in data:
            raise serializers.ValidationError({'listing': 'A business listing must be specified.'})

        # Pop any remaining duplicate id fields if both were passed
        data.pop('business_id', None)
        data.pop('listing_id', None)

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            existing = InterestRequest.objects.filter(
                listing=data['listing'],
                buyer=request.user,
                status__in=['pending', 'accepted']
            ).exists()
            if existing:
                raise serializers.ValidationError('You already have an active request for this listing.')
        return data

    def create(self, validated_data):
        validated_data.pop('business_id', None)
        validated_data.pop('listing_id', None)
        request = self.context['request']
        validated_data['buyer'] = request.user
        listing = validated_data['listing']
        validated_data['seller'] = listing.owner
        if validated_data.get('nda_signed') and not validated_data.get('nda_accepted_at'):
            from django.utils import timezone
            validated_data['nda_accepted_at'] = timezone.now()
        return super().create(validated_data)
