from django.urls import path
from . import views

urlpatterns = [
    # Public browse
    path('', views.BusinessListingListView.as_view(), name='listing-list'),
    path('<int:pk>/', views.BusinessListingDetailView.as_view(), name='listing-detail'),
    # Seller
    path('my/', views.MyListingsView.as_view(), name='my-listings'),
    # Admin actions
    path('<int:pk>/approve/', views.ListingApproveView.as_view(), name='listing-approve'),
    path('<int:pk>/reject/', views.ListingRejectView.as_view(), name='listing-reject'),
    path('<int:pk>/resubmit/', views.ListingResubmitView.as_view(), name='listing-resubmit'),
    # Verification
    path('<int:pk>/verification/upload/', views.VerificationDocumentUploadView.as_view(), name='verification-upload'),
    path('<int:pk>/verification/documents/<int:doc_id>/', views.VerificationDocumentDeleteView.as_view(), name='verification-delete'),
    path('<int:pk>/verification/submit/', views.VerificationSubmitView.as_view(), name='verification-submit'),
    path('<int:pk>/verification/review/', views.VerificationReviewView.as_view(), name='verification-review'),
    path('verifications/', views.AdminVerificationListView.as_view(), name='admin-verifications'),
    # Image upload
    path('upload/image/', views.ImageUploadView.as_view(), name='image-upload'),
]
