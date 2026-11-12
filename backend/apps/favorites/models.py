from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.listings.models import BusinessListing


class Favorite(TimeStampedModel):
    """A buyer's saved/bookmarked business listing."""
    business = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorites'
    )

    class Meta:
        unique_together = ['business', 'buyer']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.buyer.username} ♥ {self.business.title}"
