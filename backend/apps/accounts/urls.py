from django.urls import path
from .views import (
    CurrentUserProfileView, LoginView, LogoutView, RegisterView,
    AdminUserListView, AdminUserDetailView, AdminStatsView, ChangePasswordView,
    ForgotPasswordView, ResetPasswordConfirmView
)

app_name = 'accounts'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/', LoginView.as_view(), name='token'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', CurrentUserProfileView.as_view(), name='user-profile'),
    path('me/', CurrentUserProfileView.as_view(), name='user-me'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/', ForgotPasswordView.as_view(), name='password-reset'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('password-reset-confirm/', ResetPasswordConfirmView.as_view(), name='password-reset-confirm'),
    path('reset-password/', ResetPasswordConfirmView.as_view(), name='reset-password'),
    # Admin
    path('admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
]
