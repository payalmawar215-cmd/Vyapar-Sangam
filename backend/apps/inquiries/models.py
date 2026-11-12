from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.listings.models import BusinessListing


class InterestRequest(TimeStampedModel):
    """
    Buyer interest/purchase request for a specific business listing.
    Replaces the old Inquiry model with full NDA workflow support.
    """
    class RequestStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        WITHDRAWN = 'withdrawn', 'Withdrawn'

    class RequestType(models.TextChoices):
        BUY = 'buy', 'Purchase Request'
        CONTACT = 'contact', 'Contact Request'

    listing = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='interest_requests'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_requests'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_requests'
    )

    request_type = models.CharField(
        max_length=20,
        choices=RequestType.choices,
        default=RequestType.BUY
    )
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING
    )

    # Buyer contact details (filled at request time)
    buyer_name = models.CharField(max_length=255, blank=True)
    buyer_email = models.EmailField(blank=True)
    buyer_phone = models.CharField(max_length=30, blank=True)

    # Purpose / message
    purpose = models.TextField(blank=True)
    message = models.TextField(blank=True)

    # NDA fields
    nda_version = models.CharField(max_length=100, blank=True, default='VS-NDA v1.0 (2026-10-11)')
    nda_document = models.TextField(blank=True, help_text="Full NDA text at time of signing")
    nda_signed = models.BooleanField(default=False)
    nda_accepted_at = models.DateTimeField(null=True, blank=True)
    signature_file = models.FileField(upload_to='signatures/', null=True, blank=True)

    # Seller response
    seller_response = models.TextField(blank=True)
    decision_date = models.DateTimeField(null=True, blank=True)

    # Tracking
    email_status = models.CharField(max_length=30, default='pending')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request for {self.listing.title} by {self.buyer.username}"


# Keep old Inquiry name as alias for backward compat
class Inquiry(TimeStampedModel):
    """Legacy inquiry model - kept for backward compatibility."""
    class InquiryStatus(models.TextChoices):
        NEW = 'NEW', 'New'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        ACCEPTED = 'ACCEPTED', 'Accepted / In Discussions'
        REJECTED = 'REJECTED', 'Declined'

    listing = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='inquiries'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_inquiries'
    )
    message = models.TextField()
    nda_signed = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=InquiryStatus.choices,
        default=InquiryStatus.NEW
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Inquiry for {self.listing.title} by {self.buyer.username}"
