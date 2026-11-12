from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Favorite
from .serializers import FavoriteSerializer
from apps.listings.models import BusinessListing


class FavoriteListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favs = Favorite.objects.filter(buyer=request.user).select_related('business')
        return Response(FavoriteSerializer(favs, many=True, context={'request': request}).data)

    def post(self, request):
        business_id = request.data.get('business')
        if not business_id:
            return Response({'error': 'Business ID required.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        business = get_object_or_404(BusinessListing, pk=business_id)
        fav, created = Favorite.objects.get_or_create(buyer=request.user, business=business)
        if not created:
            return Response({'error': 'Already favorited.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        return Response(FavoriteSerializer(fav, context={'request': request}).data,
                        status=drf_status.HTTP_201_CREATED)


class FavoriteDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        fav = get_object_or_404(Favorite, pk=pk, buyer=request.user)
        fav.delete()
        return Response(status=drf_status.HTTP_204_NO_CONTENT)


class FavoriteToggleView(APIView):
    """Toggle favorite by business ID."""
    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        business = get_object_or_404(BusinessListing, pk=business_id)
        fav = Favorite.objects.filter(buyer=request.user, business=business).first()
        if fav:
            fav.delete()
            return Response({'favorited': False, 'message': 'Removed from favorites.'})
        fav = Favorite.objects.create(buyer=request.user, business=business)
        return Response({'favorited': True, 'id': fav.id, 'message': 'Added to favorites.'},
                        status=drf_status.HTTP_201_CREATED)
