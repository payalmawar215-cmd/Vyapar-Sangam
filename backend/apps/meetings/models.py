from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.listings.models import BusinessListing


class Meeting(TimeStampedModel):
    """
    Feature 4: Meeting & Site Visit Scheduler.
    Allowed only after mutual NDA acknowledgement and linked to a Deal.
    """
    class MeetingType(models.TextChoices):
        ONLINE = 'online', 'Online Meeting'
        SITE_VISIT = 'site_visit', 'Business Site Visit'

    class MeetingStatus(models.TextChoices):
        REQUESTED = 'requested', 'Requested'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        RESCHEDULE_PROPOSED = 'reschedule_proposed', 'Reschedule Proposed'
        RESCHEDULED = 'rescheduled', 'Rescheduled'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'

    deal = models.ForeignKey(
        'deals.Deal',
        on_delete=models.CASCADE,
        related_name='meetings',
        null=True,
        blank=True
    )
    business = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='meetings'
    )
    nda = models.ForeignKey(
        'nda.NDA',
        on_delete=models.CASCADE,
        related_name='meetings'
    )
    request = models.ForeignKey(
        'inquiries.InterestRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='meetings'
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='buyer_meetings'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='seller_meetings'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_meetings'
    )

    meeting_type = models.CharField(
        max_length=30,
        choices=MeetingType.choices,
        default=MeetingType.ONLINE
    )
    status = models.CharField(
        max_length=30,
        choices=MeetingStatus.choices,
        default=MeetingStatus.REQUESTED
    )

    preferred_date = models.DateField(help_text="Buyer's primary preferred date")
    preferred_time = models.TimeField(help_text="Buyer's primary preferred time")
    alternative_date = models.DateField(null=True, blank=True, help_text="Optional alternative date")
    alternative_time = models.TimeField(null=True, blank=True, help_text="Optional alternative time")
    purpose = models.TextField(blank=True, help_text="Message or purpose of the meeting")

    # Seller feedback / scheduling response
    online_meeting_link = models.CharField(max_length=500, blank=True, help_text="Google Meet, Zoom or similar link")
    site_visit_location = models.TextField(blank=True, help_text="Physical site visit address and meeting instructions")

    # Reschedule proposal details
    reschedule_date = models.DateField(null=True, blank=True)
    reschedule_time = models.TimeField(null=True, blank=True)
    reschedule_reason = models.TextField(blank=True)

    # Rejection or cancellation details
    rejection_reason = models.TextField(blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='cancelled_meetings'
    )
    cancellation_reason = models.TextField(blank=True)

    # Confirmed finalized slot
    confirmed_date = models.DateField(null=True, blank=True)
    confirmed_time = models.TimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        title = self.business.title if self.business else "Business"
        return f"{self.get_meeting_type_display()} for {title} ({self.status})"


class MeetingStatusHistory(TimeStampedModel):
    """
    Timestamped audit log of all meeting status changes.
    """
    meeting = models.ForeignKey(
        Meeting,
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
        related_name='meeting_status_changes'
    )
    note = models.TextField(blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Meeting #{self.meeting_id}: {self.from_status} → {self.to_status} at {self.created_at}"
