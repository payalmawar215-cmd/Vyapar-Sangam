from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.listings.models import BusinessListing


class NDA(TimeStampedModel):
    """
    Non-Disclosure Agreement between buyer and seller for a business listing.
    Created when seller accepts a buyer's interest request.
    """
    class NDAStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED_BY_BUYER = 'accepted_by_buyer', 'Accepted by Buyer'
        ACCEPTED_BY_SELLER = 'accepted_by_seller', 'Accepted by Seller'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    request = models.OneToOneField(
        'inquiries.InterestRequest',
        on_delete=models.CASCADE,
        related_name='nda',
        null=True,
        blank=True
    )
    business = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='ndas'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='buyer_ndas'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='seller_ndas'
    )

    buyer_name = models.CharField(max_length=255, blank=True)
    seller_name = models.CharField(max_length=255, blank=True)

    status = models.CharField(
        max_length=30,
        choices=NDAStatus.choices,
        default=NDAStatus.PENDING
    )

    buyer_accepted = models.BooleanField(default=False)
    seller_accepted = models.BooleanField(default=False)
    buyer_accepted_date = models.DateTimeField(null=True, blank=True)
    seller_accepted_date = models.DateTimeField(null=True, blank=True)

    nda_version = models.CharField(max_length=100, blank=True, default='VS-NDA v1.0 (2026-10-11)')
    nda_text = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'NDA'
        verbose_name_plural = 'NDAs'

    def __str__(self):
        return f"NDA: {self.buyer_name} ↔ {self.seller_name} for {self.business.title}"


class ContactExchange(TimeStampedModel):
    """
    Feature 5: Secure Mutual Contact Sharing between Buyer and Seller.
    Personal contact info (phone/email) is revealed ONLY when BOTH parties
    have explicitly given consent after NDA acknowledgement.
    """
    class ExchangeStatus(models.TextChoices):
        PENDING = 'pending', 'Waiting for Approval'
        SHARED = 'shared', 'Mutually Shared'
        DECLINED = 'declined', 'Declined'
        CANCELLED = 'cancelled', 'Cancelled'

    business = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='contact_exchanges'
    )
    deal = models.ForeignKey(
        'deals.Deal',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='contact_exchanges'
    )
    nda = models.ForeignKey(
        NDA,
        on_delete=models.CASCADE,
        related_name='contact_exchanges'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='buyer_contact_exchanges'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='seller_contact_exchanges'
    )
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='initiated_contact_exchanges'
    )

    buyer_consented = models.BooleanField(default=False)
    buyer_consented_at = models.DateTimeField(null=True, blank=True)
    seller_consented = models.BooleanField(default=False)
    seller_consented_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=30,
        choices=ExchangeStatus.choices,
        default=ExchangeStatus.PENDING
    )
    declined_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='declined_contact_exchanges'
    )
    declined_at = models.DateTimeField(null=True, blank=True)
    decline_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.deal_id and hasattr(self, 'nda') and self.nda:
            # Look up deal via nda if available
            deal = getattr(self.nda, 'deal', None)
            if deal:
                self.deal = deal
        elif self.deal_id and (not hasattr(self, 'nda') or not self.nda):
            if hasattr(self.deal, 'nda') and self.deal.nda:
                self.nda = self.deal.nda
        super().save(*args, **kwargs)

    def __str__(self):
        return f"ContactExchange: {self.buyer.username} ↔ {self.seller.username} [{self.status}]"
