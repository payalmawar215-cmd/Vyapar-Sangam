from django.urls import path
from . import views

urlpatterns = [
    path('', views.NDAListView.as_view(), name='nda-list'),
    path('<int:pk>/', views.NDADetailView.as_view(), name='nda-detail'),
    path('<int:pk>/acknowledge/', views.NDAAcknowledgeView.as_view(), name='nda-acknowledge'),
    # Feature 5: Contact Exchange
    path('contact-exchange/', views.ContactExchangeListView.as_view(), name='contact-exchange-list'),
    path('contact-exchange/status/<int:nda_id>/', views.ContactExchangeStatusView.as_view(), name='contact-exchange-status'),
    path('contact-exchange/deal/<int:deal_id>/', views.ContactExchangeByDealView.as_view(), name='contact-exchange-deal'),
    path('contact-exchange/<int:pk>/accept/', views.ContactExchangeAcceptView.as_view(), name='contact-exchange-accept'),
    path('contact-exchange/<int:pk>/decline/', views.ContactExchangeDeclineView.as_view(), name='contact-exchange-decline'),
    path('contact-exchange/<int:pk>/cancel/', views.ContactExchangeCancelView.as_view(), name='contact-exchange-cancel'),
]
