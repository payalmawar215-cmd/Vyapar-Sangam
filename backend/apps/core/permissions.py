from rest_framework.permissions import BasePermission


class IsSeller(BasePermission):
    """Allow access only to users with SELLER role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.role.upper() == 'SELLER')


class IsBuyer(BasePermission):
    """Allow access only to users with BUYER role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.role.upper() == 'BUYER')


class IsAdminRole(BasePermission):
    """Allow access to users with ADMIN role, Django staff, or superusers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    (request.user.role.upper() == 'ADMIN' or request.user.is_staff or request.user.is_superuser))


class IsOwnerOrAdmin(BasePermission):
    """Allow object-level access only to the owner, staff, or admins."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role.upper() == 'ADMIN' or request.user.is_staff or request.user.is_superuser:
            return True
        # Check for common owner field patterns
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'buyer'):
            return obj.buyer == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsPartyToNDA(BasePermission):
    """Allow access only to buyer or seller of an NDA."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return obj.buyer == request.user or obj.seller == request.user


def notify_user(user, title, message, link='', notification_type='info'):
    """Helper to create a Notification for a user."""
    from apps.notifications.models import Notification
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        link=link,
        notification_type=notification_type
    )
