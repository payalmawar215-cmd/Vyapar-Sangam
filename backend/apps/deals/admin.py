from django.contrib import admin
from .models import Deal

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer_name', 'seller_name', 'business', 'status', 'created_at']
    list_filter = ['status']
