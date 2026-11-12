from django.contrib import admin
from .models import Category, BusinessListing


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(BusinessListing)
class BusinessListingAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'category', 'status', 'asking_price', 'city', 'created_at']
    list_filter = ['status', 'category', 'is_featured', 'is_confidential']
    search_fields = ['title', 'name', 'summary', 'city']
    actions = ['approve_listings', 'reject_listings']

    def approve_listings(self, request, queryset):
        queryset.update(status='approved')
    approve_listings.short_description = 'Approve selected listings'

    def reject_listings(self, request, queryset):
        queryset.update(status='rejected')
    reject_listings.short_description = 'Reject selected listings'
