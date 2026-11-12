from django.urls import path
from . import views

urlpatterns = [
    path('', views.DealListView.as_view(), name='deal-list'),
    path('<int:pk>/', views.DealDetailView.as_view(), name='deal-detail'),
    path('<int:pk>/contact-exchange/', views.DealContactExchangeView.as_view(), name='deal-contact-exchange'),
]
