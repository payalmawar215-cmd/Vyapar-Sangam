from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.listings.models import BusinessListing


class Deal(TimeStampedModel):
    """
    Deal record created after both parties acknowledge the NDA.
    Tracks the progression of a business acquisition deal.
    """
    class DealStatus(models.TextChoices):
        NDA_COMPLETED = 'nda_completed', 'NDA Completed'
        DISCUSSION_IN_PROGRESS = 'discussion_in_progress', 'Discussion in Progress'
        DISCUSSION = 'discussion', 'Discussion in Progress'  # backward compat
        MEETING_SCHEDULED = 'meeting_scheduled', 'Meeting Scheduled'
        UNDER_NEGOTIATION = 'under_negotiation', 'Under Negotiation'
        OFFER_MADE = 'offer_made', 'Offer Made'
        OFFER_ACCEPTED = 'offer_accepted', 'Offer Accepted'
        DEAL_CLOSED = 'deal_closed', 'Deal Closed'
        COMPLETED = 'completed', 'Deal Closed'  # backward compat
        DEAL_CANCELLED = 'deal_cancelled', 'Deal Cancelled'
        CANCELLED = 'cancelled', 'Deal Cancelled'  # backward compat

    business = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='deals'
    )
    nda = models.OneToOneField(
        'nda.NDA',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deal'
    )
    request = models.OneToOneField(
        'inquiries.InterestRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deal'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='buyer_deals'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='seller_deals'
    )

    buyer_name = models.CharField(max_length=255, blank=True)
    seller_name = models.CharField(max_length=255, blank=True)

    status = models.CharField(
        max_length=50,
        choices=DealStatus.choices,
        default=DealStatus.NDA_COMPLETED
    )

    notes = models.TextField(blank=True)
    deal_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Deal: {self.buyer_name} ↔ {self.seller_name} for {self.business.title}"


class DealStatusHistory(TimeStampedModel):
    """
    Timestamped audit log of all deal status transitions.
    """
    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    from_status = models.CharField(max_length=50, blank=True)
    to_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deal_status_changes'
    )
    note = models.TextField(blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Deal #{self.deal_id}: {self.from_status} → {self.to_status} at {self.created_at}"
