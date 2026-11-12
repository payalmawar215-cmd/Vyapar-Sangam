from rest_framework import serializers
from .models import Category, BusinessListing, BusinessVerificationDocument, ListingReviewHistory
from apps.accounts.serializers import UserSerializer


class CategorySerializer(serializers.ModelSerializer):
    listings_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'listings_count']

    def get_listings_count(self, obj):
        return obj.listings.filter(status='approved').count()


class BusinessVerificationDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = BusinessVerificationDocument
        fields = [
            'id', 'listing', 'document_type', 'document_type_display',
            'title', 'file', 'file_url', 'file_name', 'file_size',
            'status', 'admin_notes', 'created_at'
        ]
        read_only_fields = ['id', 'listing', 'file_url', 'file_name', 'file_size', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ListingReviewHistorySerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = ListingReviewHistory
        fields = ['id', 'listing', 'reviewer', 'reviewer_name', 'action', 'reason', 'feedback', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return obj.reviewer.get_full_name() or obj.reviewer.username
        return 'System'


class BusinessListingSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    seller_id = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    years_in_operation = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    verification_documents = serializers.SerializerMethodField()
    review_history = serializers.SerializerMethodField()

    class Meta:
        model = BusinessListing
        fields = [
            'id', 'title', 'name', 'short_description', 'summary', 'description',
            'category', 'category_name', 'city', 'state', 'location',
            'asking_price', 'annual_revenue', 'annual_cashflow', 'annual_profit',
            'established_year', 'years_in_operation', 'employees_count',
            'reason_for_sale', 'highlights', 'images', 'featured_image',
            'status', 'is_confidential', 'is_featured', 'views_count',
            'seller', 'seller_id',
            # Feature 1: Handover
            'training_provided', 'training_duration', 'training_duration_custom',
            'employee_continuity', 'customer_introductions', 'transition_support_details',
            # Feature 2: Verification
            'verification_status', 'verified_at', 'verification_feedback', 'is_verified',
            'verification_documents',
            # Feature 3: Rejection & Resubmission
            'rejection_reason', 'rejection_feedback', 'rejected_at', 'resubmitted_at',
            'review_history',
            'is_favorited', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'seller', 'seller_id', 'views_count', 'is_verified', 'created_at', 'updated_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_seller(self, obj):
        return obj.owner.get_full_name() or obj.owner.username

    def get_seller_id(self, obj):
        return obj.owner.id

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.favorited_by.filter(buyer=request.user).exists()

    def get_years_in_operation(self, obj):
        if obj.years_in_operation:
            return obj.years_in_operation
        if obj.established_year:
            from datetime import date
            return date.today().year - obj.established_year
        return None

    def get_is_verified(self, obj):
        return obj.verification_status == 'verified'

    def get_verification_documents(self, obj):
        # Expose documents ONLY to listing owner and admins
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        user = request.user
        if user == obj.owner or user.role.upper() == 'ADMIN' or user.is_staff:
            docs = obj.verification_documents.all()
            return BusinessVerificationDocumentSerializer(docs, many=True, context=self.context).data
        return []

    def get_review_history(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        user = request.user
        if user == obj.owner or user.role.upper() == 'ADMIN' or user.is_staff:
            history = obj.review_history.all()
            return ListingReviewHistorySerializer(history, many=True, context=self.context).data
        return []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('name'):
            data['name'] = data.get('title', '')
        if not data.get('annual_profit'):
            data['annual_profit'] = data.get('annual_cashflow')
        return data


class BusinessListingCreateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    featured_image = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = BusinessListing
        fields = [
            'title', 'name', 'short_description', 'summary', 'description',
            'category', 'city', 'state', 'location',
            'asking_price', 'annual_revenue', 'annual_cashflow', 'annual_profit',
            'established_year', 'years_in_operation', 'employees_count',
            'reason_for_sale', 'highlights', 'images', 'featured_image',
            'status', 'is_confidential',
            # Feature 1 Handover fields
            'training_provided', 'training_duration', 'training_duration_custom',
            'employee_continuity', 'customer_introductions', 'transition_support_details'
        ]

    def to_internal_value(self, data):
        # Support dict-like querydict or mutable dict
        data = dict(data) if hasattr(data, 'dict') else dict(data)
        
        # Flatten single-item lists if any
        for k, v in list(data.items()):
            if isinstance(v, list) and k not in ['images', 'highlights'] and len(v) == 1:
                data[k] = v[0]

        # Sync title and name
        if data.get('name') and not data.get('title'):
            data['title'] = data['name']
        elif data.get('title') and not data.get('name'):
            data['name'] = data['title']

        # Field alias mappings
        if 'reason_for_selling' in data and 'reason_for_sale' not in data:
            data['reason_for_sale'] = data['reason_for_selling']
        if 'employees' in data and 'employees_count' not in data:
            data['employees_count'] = data['employees']
        if 'annual_profit' in data and 'annual_cashflow' not in data:
            data['annual_cashflow'] = data['annual_profit']

        # Training boolean normalization
        if 'training_provided' in data:
            tp = data['training_provided']
            if isinstance(tp, str):
                data['training_provided'] = tp.lower() in ['true', '1', 'yes']

        # Clear training duration if not provided
        if not data.get('training_provided'):
            data['training_duration'] = ''
            data['training_duration_custom'] = ''

        # Category resolution (accepts PK integer, category name, or slug)
        if 'category' in data:
            cat_val = data.get('category')
            if cat_val:
                try:
                    cat_id = int(cat_val)
                    cat_obj = Category.objects.filter(pk=cat_id).first()
                except (ValueError, TypeError):
                    cat_obj = Category.objects.filter(name__iexact=str(cat_val).strip()).first() or \
                              Category.objects.filter(slug__iexact=str(cat_val).strip()).first()
                data['category'] = str(cat_obj.id) if cat_obj else ""
            else:
                data['category'] = ""

        return super().to_internal_value(data)

    def validate(self, attrs):
        # Ensure category is a Category model instance when category is provided
        if 'category' in attrs:
            cat_val = attrs.get('category')
            if cat_val:
                cat_obj = Category.objects.filter(pk=cat_val).first()
                attrs['category'] = cat_obj
            else:
                attrs['category'] = None

        # Ensure title has a value
        if not attrs.get('title') and attrs.get('name'):
            attrs['title'] = attrs['name']
        elif not attrs.get('title'):
            attrs['title'] = "Business Listing"

        # Auto-set featured_image from first image if available
        images = attrs.get('images', [])
        if images and isinstance(images, list) and not attrs.get('featured_image'):
            attrs['featured_image'] = images[0]

        return attrs

    def validate_status(self, value):
        allowed = ['draft', 'pending']
        request = self.context.get('request')
        user = request.user if request else None
        if user and (user.role.upper() == 'ADMIN' or user.is_staff):
            return value
        if value not in allowed:
            raise serializers.ValidationError(f"Status must be one of: {allowed}")
        return value

    def create(self, validated_data):
        request = self.context['request']
        validated_data['owner'] = request.user
        if not validated_data.get('name') and validated_data.get('title'):
            validated_data['name'] = validated_data['title']
        return super().create(validated_data)
