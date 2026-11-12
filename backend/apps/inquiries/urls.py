from django.urls import path
from . import views

urlpatterns = [
    path('', views.InterestRequestListView.as_view(), name='request-list'),
    path('<int:pk>/', views.InterestRequestDetailView.as_view(), name='request-detail'),
    path('<int:pk>/accept/', views.RequestAcceptView.as_view(), name='request-accept'),
    path('<int:pk>/reject/', views.RequestRejectView.as_view(), name='request-reject'),
    path('upload/signature/', views.SignatureUploadView.as_view(), name='signature-upload'),
]
