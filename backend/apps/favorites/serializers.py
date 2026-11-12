from rest_framework import serializers
from .models import Favorite
from apps.listings.serializers import BusinessListingSerializer


class FavoriteSerializer(serializers.ModelSerializer):
    business_detail = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = ['id', 'business', 'business_detail', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_business_detail(self, obj):
        request = self.context.get('request')
        return BusinessListingSerializer(obj.business, context={'request': request}).data
