from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """In-app notification for a user."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True)
    read = models.BooleanField(default=False)
    notification_type = models.CharField(max_length=50, default='info')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.user.username}"
