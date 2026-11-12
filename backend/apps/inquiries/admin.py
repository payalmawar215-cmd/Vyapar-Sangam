from django.contrib import admin
from .models import InterestRequest, Inquiry


@admin.register(InterestRequest)
class InterestRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'listing', 'request_type', 'status', 'created_at']
    list_filter = ['status', 'request_type']


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer', 'listing', 'status', 'created_at']
    list_filter = ['status']
