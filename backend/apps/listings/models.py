from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class Category(TimeStampedModel):
    """Business industry or sector category."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, default='🏢')

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class BusinessListing(TimeStampedModel):
    """
    Core marketplace listing representing a business up for succession or sale.
    """
    class ListingStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved / Live'
        CHANGES_REQUIRED = 'changes_required', 'Changes Required'
        REJECTED = 'rejected', 'Rejected'
        UNDER_OFFER = 'under_offer', 'Under Negotiation'
        SOLD = 'sold', 'Successfully Acquired'
        INACTIVE = 'inactive', 'Inactive'

    class VerificationStatus(models.TextChoices):
        NOT_SUBMITTED = 'not_submitted', 'Not Submitted'
        UNDER_VERIFICATION = 'under_verification', 'Under Verification'
        VERIFIED = 'verified', 'Verified'
        CHANGES_REQUIRED = 'changes_required', 'Changes Required'

    class TrainingDuration(models.TextChoices):
        DAYS_7 = '7_days', '7 days'
        DAYS_15 = '15_days', '15 days'
        DAYS_30 = '30_days', '30 days'
        DAYS_60 = '60_days', '60 days'
        CUSTOM = 'custom', 'Custom duration'

    class EmployeeContinuity(models.TextChoices):
        YES = 'yes', 'Yes'
        NO = 'no', 'No'
        DISCUSSION = 'open_for_discussion', 'Open for discussion'

    class CustomerIntroductions(models.TextChoices):
        YES = 'yes', 'Yes'
        NO = 'no', 'No'
        LIMITED = 'limited', 'Limited support'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='listings'
    )
    title = models.CharField(max_length=255, help_text="Public listing headline")
    name = models.CharField(max_length=255, blank=True, help_text="Business name (alias for title)")
    short_description = models.CharField(max_length=300, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='listings'
    )
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True, help_text="Street/area description")

    # Financial Overview
    asking_price = models.DecimalField(max_digits=14, decimal_places=2, help_text="Asking valuation in INR", default=0)
    annual_revenue = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    annual_cashflow = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True, help_text="EBITDA or Net Profit")
    annual_profit = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True, help_text="Annual profit (alias for cashflow)")

    # Business Details
    established_year = models.PositiveIntegerField(blank=True, null=True)
    years_in_operation = models.PositiveIntegerField(blank=True, null=True)
    employees_count = models.PositiveIntegerField(blank=True, null=True)
    summary = models.TextField(blank=True, help_text="Executive summary of the business")
    description = models.TextField(blank=True)
    reason_for_sale = models.TextField(blank=True, null=True, help_text="e.g. Retirement, Relocation, Succession")

    # Feature 1: Business Handover & Transition Support
    training_provided = models.BooleanField(default=False, help_text="Will you provide training to the new owner?")
    training_duration = models.CharField(
        max_length=50,
        blank=True,
        choices=TrainingDuration.choices,
        help_text="Expected duration of transition training"
    )
    training_duration_custom = models.CharField(max_length=100, blank=True, help_text="Custom training duration description")
    employee_continuity = models.CharField(
        max_length=50,
        blank=True,
        choices=EmployeeContinuity.choices,
        default=EmployeeContinuity.DISCUSSION,
        help_text="Will existing employees continue under the new ownership?"
    )
    customer_introductions = models.CharField(
        max_length=50,
        blank=True,
        choices=CustomerIntroductions.choices,
        default=CustomerIntroductions.YES,
        help_text="Will you introduce the new owner to existing customers and suppliers?"
    )
    transition_support_details = models.TextField(blank=True, help_text="Additional transition support details & handover plan")

    # Feature 2: Business Verification
    verification_status = models.CharField(
        max_length=30,
        choices=VerificationStatus.choices,
        default=VerificationStatus.NOT_SUBMITTED,
        help_text="Separate verification lifecycle status"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='verified_listings'
    )
    verification_notes = models.TextField(blank=True, help_text="Admin internal verification notes")
    verification_feedback = models.TextField(blank=True, help_text="Feedback visible to seller regarding verification")

    # Feature 3: Rejection & Resubmission Tracking
    rejection_reason = models.CharField(max_length=120, blank=True, help_text="Standard category/reason for rejection")
    rejection_feedback = models.TextField(blank=True, help_text="Detailed feedback for the seller explaining rejection/changes")
    rejected_at = models.DateTimeField(null=True, blank=True)
    resubmitted_at = models.DateTimeField(null=True, blank=True)

    # Rich content
    highlights = models.JSONField(default=list, blank=True, help_text="Key selling points as string array")
    images = models.JSONField(default=list, blank=True, help_text="Image URL array")
    featured_image = models.CharField(blank=True, max_length=500, default="")

    status = models.CharField(
        max_length=20,
        choices=ListingStatus.choices,
        default=ListingStatus.DRAFT
    )
    is_confidential = models.BooleanField(
        default=False,
        help_text="If true, exact business name & detailed address are concealed until NDA is signed."
    )
    is_featured = models.BooleanField(default=False)
    views_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - ₹{self.asking_price}"

    def save(self, *args, **kwargs):
        # Keep name in sync with title
        if self.title and not self.name:
            self.name = self.title
        # Clear training duration if training is not provided
        if not self.training_provided:
            self.training_duration = ''
            self.training_duration_custom = ''
        super().save(*args, **kwargs)


class BusinessVerificationDocument(TimeStampedModel):
    """
    Supporting business verification documents uploaded by sellers.
    Stored privately in 'verification_docs/' and accessible only to seller and admins.
    """
    class DocumentType(models.TextChoices):
        BUSINESS_REGISTRATION = 'business_registration', 'Business Registration Proof'
        GST_CERTIFICATE = 'gst_certificate', 'GST Registration'
        OWNERSHIP_PROOF = 'ownership_proof', 'Business Ownership / Authorization Proof'
        FINANCIAL_PROOF = 'financial_proof', 'Financial Statements / Tax Proof'
        OTHER = 'other', 'Other Supporting Document'

    class DocumentStatus(models.TextChoices):
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved'
        CHANGES_REQUESTED = 'changes_requested', 'Changes Requested'

    listing = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='verification_documents'
    )
    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        default=DocumentType.BUSINESS_REGISTRATION
    )
    title = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to='verification_docs/')
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=30,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING
    )
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_document_type_display()}] {self.file_name or self.title} for {self.listing.title}"


class ListingReviewHistory(TimeStampedModel):
    """
    Audit log of listing moderation events (approve, reject, changes_requested, resubmit).
    """
    listing = models.ForeignKey(
        BusinessListing,
        on_delete=models.CASCADE,
        related_name='review_history'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='listing_reviews'
    )
    action = models.CharField(max_length=40)  # approved, rejected, changes_required, resubmitted
    reason = models.CharField(max_length=120, blank=True)
    feedback = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} on {self.listing.title} at {self.created_at}"
