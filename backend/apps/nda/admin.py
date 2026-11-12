from django.contrib import admin
from .models import NDA

@admin.register(NDA)
class NDAAdmin(admin.ModelAdmin):
    list_display = ['id', 'buyer_name', 'seller_name', 'business', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['buyer_name', 'seller_name', 'business__title']
