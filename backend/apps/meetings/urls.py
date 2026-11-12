from django.urls import path
from . import views

urlpatterns = [
    path('', views.MeetingListView.as_view(), name='meeting-list'),
    path('eligible-deals/', views.EligibleDealsView.as_view(), name='meeting-eligible-deals'),
    path('<int:pk>/', views.MeetingDetailView.as_view(), name='meeting-detail'),
    path('<int:pk>/accept/', views.MeetingAcceptView.as_view(), name='meeting-accept'),
    path('<int:pk>/reject/', views.MeetingRejectView.as_view(), name='meeting-reject'),
    path('<int:pk>/propose-reschedule/', views.MeetingProposeRescheduleView.as_view(), name='meeting-propose-reschedule'),
    path('<int:pk>/accept-reschedule/', views.MeetingAcceptRescheduleView.as_view(), name='meeting-accept-reschedule'),
    path('<int:pk>/cancel/', views.MeetingCancelView.as_view(), name='meeting-cancel'),
    path('<int:pk>/complete/', views.MeetingCompleteView.as_view(), name='meeting-complete'),
]
