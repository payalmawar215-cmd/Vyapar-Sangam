from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom user model for Vyapar Sangam supporting buyers, sellers, advisors, and admins.
    """
    class RoleChoices(models.TextChoices):
        BUYER = 'BUYER', 'Business Buyer'
        SELLER = 'SELLER', 'Business Seller'
        ADVISOR = 'ADVISOR', 'M&A Advisor / Broker'
        ADMIN = 'ADMIN', 'Platform Admin'

    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.BUYER,
        help_text="User type in the marketplace"
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    is_verified = models.BooleanField(default=False, help_text="Designates whether the user's KYC/credentials are verified.")

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.username

    @property
    def app_role(self):
        if self.role == 'ADMIN' or self.is_staff or self.is_superuser:
            return 'admin'
        return self.role.lower()

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
