"""
URL configuration for vyapar_sangam project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.listings.views import CategoryListView, CategoryDetailView
from apps.core.views import SecureMediaView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/listings/', include('apps.listings.urls')),
    path('api/categories/', CategoryListView.as_view(), name='category-list'),
    path('api/categories/<int:pk>/', CategoryDetailView.as_view(), name='category-detail'),
    path('api/requests/', include('apps.inquiries.urls')),
    path('api/nda/', include('apps.nda.urls')),
    path('api/deals/', include('apps.deals.urls')),
    path('api/meetings/', include('apps.meetings.urls')),
    path('api/favorites/', include('apps.favorites.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/', include('apps.core.urls')),
    path('media/<path:file_path>', SecureMediaView.as_view(), name='secure-media'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
