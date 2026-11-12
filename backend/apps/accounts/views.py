from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db.models import Count
from .serializers import UserSerializer, LoginSerializer, RegisterSerializer

User = get_user_model()


class RegisterView(APIView):
    """Register a new Buyer or Seller user, returning an Auth Token and user profile."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'message': 'Account created successfully.',
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        errors = serializer.errors
        error_message = 'Please correct the highlighted errors.'
        for field in ['non_field_errors', 'email', 'username', 'password_confirm', 'password', 'full_name']:
            if field in errors and errors[field]:
                error_message = errors[field][0]
                break

        return Response({'error': error_message, 'details': errors}, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """Authenticate user with username or email and password."""
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'username' not in payload and 'email' in payload:
            payload['username'] = payload['email']

        serializer = LoginSerializer(data=payload, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'message': 'Login successful.'
            }, status=status.HTTP_200_OK)

        errors = serializer.errors
        error_message = 'Unable to log in with provided credentials.'
        for field in ['non_field_errors', 'username', 'password']:
            if field in errors and errors[field]:
                error_message = errors[field][0]
                break

        return Response({'error': error_message, 'details': errors}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Log out authenticated user by deleting their auth token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if hasattr(request.user, 'auth_token'):
            request.user.auth_token.delete()
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)


class CurrentUserProfileView(APIView):
    """Get or update the authenticated user's profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        data = request.data.copy()

        # Handle aliases
        if 'organization' in data and 'company_name' not in data:
            data['company_name'] = data.pop('organization')
        if 'phone' in data and 'phone_number' not in data:
            data['phone_number'] = data.pop('phone')
        if 'app_role' in data and 'role' not in data:
            data['role'] = data.pop('app_role')

        allowed_fields = ['first_name', 'last_name', 'email', 'phone_number', 'company_name', 'city', 'bio', 'role']
        clean_data = {k: v for k, v in data.items() if k in allowed_fields}

        # Role change validation
        if 'role' in clean_data:
            role_val = str(clean_data['role']).upper()
            valid_roles = [r[0] for r in User.RoleChoices.choices]
            if role_val not in valid_roles:
                return Response({'error': f'Invalid role. Choose from: {valid_roles}'}, status=status.HTTP_400_BAD_REQUEST)
            clean_data['role'] = role_val

        serializer = UserSerializer(user, data=clean_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)


class AdminUserListView(APIView):
    """Admin: list all users or update a user's role."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        qs = User.objects.all().order_by('-date_joined')
        role = request.GET.get('role')
        if role:
            qs = qs.filter(role__iexact=role)
        return Response(UserSerializer(qs, many=True).data)


class AdminUserDetailView(APIView):
    """Admin: update a user's role or details."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        target_user = get_object_or_404(User, pk=pk)

        data = request.data.copy()
        if 'app_role' in data:
            data['role'] = data.pop('app_role')
        if 'role' in data:
            data['role'] = str(data['role']).upper()

        serializer = UserSerializer(target_user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminStatsView(APIView):
    """Admin: platform statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.role.upper() == 'ADMIN' or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.listings.models import BusinessListing, Category
        from apps.inquiries.models import InterestRequest
        from apps.nda.models import NDA
        from apps.deals.models import Deal

        # Aggregate category counts
        cat_counts = BusinessListing.objects.values('category__name').annotate(count=Count('id')).order_by('-count')
        category_rows = [
            {'category': item['category__name'] or 'Uncategorized', 'count': item['count']}
            for item in cat_counts[:12]
        ]

        total_users = User.objects.count()
        buyers = User.objects.filter(role='BUYER').count()
        sellers = User.objects.filter(role='SELLER').count()
        admins = User.objects.filter(role='ADMIN').count()

        total_listings = BusinessListing.objects.count()
        pending_listings = BusinessListing.objects.filter(status='pending').count()
        approved_listings = BusinessListing.objects.filter(status='approved').count()

        total_requests = InterestRequest.objects.count()
        total_deals = Deal.objects.count()
        active_deals = Deal.objects.filter(status__in=['nda_completed', 'discussion', 'in_progress']).count()

        return Response({
            'users': total_users,
            'buyers': buyers,
            'sellers': sellers,
            'admins': admins,
            'businesses': total_listings,
            'total_listings': total_listings,
            'pending': pending_listings,
            'pending_listings': pending_listings,
            'approved': approved_listings,
            'approved_listings': approved_listings,
            'requests': total_requests,
            'total_requests': total_requests,
            'deals': active_deals,
            'total_deals': total_deals,
            'category_rows': category_rows,
        })


class ChangePasswordView(APIView):
    """Change the authenticated user's password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        if not current_password or not new_password:
            return Response({'error': 'Both current and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save()
        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)
        return Response({'message': 'Password changed successfully.', 'token': token.key})


class ForgotPasswordView(APIView):
    """Generate and send password reset token."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_token = f"{uid}__{token}"
            # Send email via independent SMTP / console backend
            try:
                send_mail(
                    subject='Reset your Vyapar Sangam password',
                    message=f'Use this reset token to change your password: {reset_token}',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception:
                pass
            return Response({
                'message': 'If an account exists with this email, a reset token has been sent.',
                'dev_token': reset_token if settings.DEBUG else None
            }, status=status.HTTP_200_OK)

        return Response({
            'message': 'If an account exists with this email, a reset token has been sent.'
        }, status=status.HTTP_200_OK)


class ResetPasswordConfirmView(APIView):
    """Reset password using token."""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '') or request.data.get('resetToken', '')
        new_password = request.data.get('password', '') or request.data.get('newPassword', '')

        if not token_str or not new_password:
            return Response({'error': 'Token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_b64, token = token_str.split('__', 1)
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({'error': 'This reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'error': 'This reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password has been reset successfully. Please log in.'}, status=status.HTTP_200_OK)
