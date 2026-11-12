import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vyapar_sangam.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.listings.models import BusinessListing, Category
from apps.nda.models import NDA, ContactExchange
from apps.deals.models import Deal
from apps.notifications.models import Notification
from apps.nda.serializers import ContactExchangeSerializer
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.nda.views import (
    ContactExchangeListView,
    ContactExchangeAcceptView,
    ContactExchangeDeclineView,
    ContactExchangeByDealView
)
from apps.deals.views import DealDetailView

User = get_user_model()
factory = APIRequestFactory()

def run_tests():
    print("=" * 60)
    print("VYAPAR SANGAM — MUTUAL CONTACT SHARING AUDIT & TEST")
    print("=" * 60)

    # 1. Setup users: Buyer, Seller, Unrelated User
    buyer, _ = User.objects.get_or_create(
        username="test_buyer_contact",
        defaults={
            "email": "buyer.test@vyaparsangam.com",
            "phone_number": "+91 98765 43210",
            "first_name": "Rohan",
            "last_name": "Verma",
            "role": "BUYER"
        }
    )
    buyer.email = "buyer.test@vyaparsangam.com"
    buyer.phone_number = "+91 98765 43210"
    buyer.first_name = "Rohan"
    buyer.last_name = "Verma"
    buyer.save()

    seller, _ = User.objects.get_or_create(
        username="test_seller_contact",
        defaults={
            "email": "seller.test@vyaparsangam.com",
            "phone_number": "+91 91234 56789",
            "first_name": "Ananya",
            "last_name": "Patel",
            "role": "SELLER"
        }
    )
    seller.email = "seller.test@vyaparsangam.com"
    seller.phone_number = "+91 91234 56789"
    seller.first_name = "Ananya"
    seller.last_name = "Patel"
    seller.save()

    unrelated, _ = User.objects.get_or_create(
        username="test_unrelated_user",
        defaults={
            "email": "unrelated@vyaparsangam.com",
            "phone_number": "+91 99999 00000",
            "first_name": "Vikram",
            "last_name": "Singh",
            "role": "BUYER"
        }
    )

    category = Category.objects.filter(name="Retail & Trading").first()
    if not category:
        category = Category.objects.first()
    if not category:
        category = Category.objects.create(name="Retail & Trading", slug="retail-trading")
    business, _ = BusinessListing.objects.get_or_create(
        owner=seller,
        title="Shree Krishna Textiles",
        defaults={
            "category": category,
            "city": "Surat",
            "asking_price": 4500000,
            "status": "approved"
        }
    )

    # Setup NDA (mutually acknowledged)
    nda, _ = NDA.objects.get_or_create(
        business=business,
        buyer=buyer,
        seller=seller,
        defaults={
            "status": "completed",
            "buyer_accepted": True,
            "seller_accepted": True,
            "buyer_name": "Rohan Verma",
            "seller_name": "Ananya Patel"
        }
    )
    nda.status = "completed"
    nda.buyer_accepted = True
    nda.seller_accepted = True
    nda.save()

    # Setup Deal
    deal, _ = Deal.objects.get_or_create(
        business=business,
        buyer=buyer,
        seller=seller,
        nda=nda,
        defaults={
            "status": "discussion_in_progress",
            "buyer_name": "Rohan Verma",
            "seller_name": "Ananya Patel"
        }
    )

    # Clean existing contact exchanges for this test
    ContactExchange.objects.filter(deal=deal).delete()
    ContactExchange.objects.filter(nda=nda).delete()

    print("\n[TEST 1] Missing Profile Validation Check:")
    # Temporarily remove phone from buyer
    buyer.phone_number = ""
    buyer.save()

    req = factory.post('/api/nda/contact-exchange/', {'deal_id': deal.id}, format='json')
    force_authenticate(req, user=buyer)
    res = ContactExchangeListView.as_view()(req)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "missing_profile" in res.data, "Expected missing_profile in response"
    print(f"  PASS: Blocked request when mobile number is missing ({res.data['error']})")

    # Restore buyer phone
    buyer.phone_number = "+91 98765 43210"
    buyer.save()

    print("\n[TEST 2] Buyer Initiates Contact Exchange:")
    Notification.objects.filter(user=seller).delete()

    req = factory.post('/api/nda/contact-exchange/', {'deal_id': deal.id}, format='json')
    force_authenticate(req, user=buyer)
    res = ContactExchangeListView.as_view()(req)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.data}"
    exchange_id = res.data['id']
    assert res.data['status'] == 'pending', f"Expected pending, got {res.data['status']}"
    assert res.data['buyer_consented'] is True, "Buyer should be consented"
    assert res.data['seller_consented'] is False, "Seller should not be consented yet"
    assert res.data['contact_details'] is None, "Contact details must be None before mutual consent!"
    print(f"  PASS: Contact exchange #{exchange_id} created in 'pending' status.")
    print("  PASS: Contact details remain hidden (None) before mutual consent.")

    print("\n[TEST 3] Duplicate Pending Request Blocked:")
    req_dup = factory.post('/api/nda/contact-exchange/', {'deal_id': deal.id}, format='json')
    force_authenticate(req_dup, user=buyer)
    res_dup = ContactExchangeListView.as_view()(req_dup)
    assert res_dup.status_code == 400, f"Expected 400, got {res_dup.status_code}"
    print("  PASS: Duplicate pending request rejected properly.")

    print("\n[TEST 4] Seller Notification Received:")
    notif = Notification.objects.filter(user=seller, title__icontains='Contact Sharing Request').first()
    assert notif is not None, "Seller did not receive contact sharing notification"
    print(f"  PASS: Seller received notification: '{notif.title}' - '{notif.message}'")

    print("\n[TEST 5] Unrelated User Access Denial:")
    req_unauth = factory.get(f'/api/nda/contact-exchange/deal/{deal.id}/')
    force_authenticate(req_unauth, user=unrelated)
    res_unauth = ContactExchangeByDealView.as_view()(req_unauth, deal_id=deal.id)
    assert res_unauth.status_code == 403, f"Expected 403 for unrelated user, got {res_unauth.status_code}"
    print("  PASS: Unrelated user was denied access (HTTP 403).")

    print("\n[TEST 6] Seller Accepts Contact Exchange:")
    Notification.objects.filter(user=buyer).delete()

    req_accept = factory.post(f'/api/nda/contact-exchange/{exchange_id}/accept/')
    force_authenticate(req_accept, user=seller)
    res_accept = ContactExchangeAcceptView.as_view()(req_accept, pk=exchange_id)
    assert res_accept.status_code == 200, f"Expected 200, got {res_accept.status_code}: {res_accept.data}"
    exchange_data = res_accept.data['exchange']
    assert exchange_data['status'] == 'shared', f"Expected status 'shared', got {exchange_data['status']}"
    assert exchange_data['buyer_consented'] is True, "Buyer consented must be True"
    assert exchange_data['seller_consented'] is True, "Seller consented must be True"
    assert exchange_data['buyer_consented_at'] is not None, "Timestamp missing"
    assert exchange_data['seller_consented_at'] is not None, "Timestamp missing"
    print("  PASS: Contact exchange accepted and status updated to 'shared'.")
    print("  PASS: Explicit consent recorded for both parties with timestamps.")

    print("\n[TEST 7] Both Parties Can View Contact Cards:")
    # Check what Buyer sees:
    req_buyer_view = factory.get(f'/api/nda/contact-exchange/deal/{deal.id}/')
    force_authenticate(req_buyer_view, user=buyer)
    res_buyer_view = ContactExchangeByDealView.as_view()(req_buyer_view, deal_id=deal.id)
    buyer_details = res_buyer_view.data['exchange']['contact_details']
    assert buyer_details is not None, "Buyer should see contact_details"
    assert buyer_details['seller']['email'] == "seller.test@vyaparsangam.com"
    assert buyer_details['seller']['phone'] == "+91 91234 56789"
    print(f"  PASS: Buyer sees Seller's contact -> Email: {buyer_details['seller']['email']}, Phone: {buyer_details['seller']['phone']}")

    # Check what Seller sees:
    req_seller_view = factory.get(f'/api/nda/contact-exchange/deal/{deal.id}/')
    force_authenticate(req_seller_view, user=seller)
    res_seller_view = ContactExchangeByDealView.as_view()(req_seller_view, deal_id=deal.id)
    seller_details = res_seller_view.data['exchange']['contact_details']
    assert seller_details is not None, "Seller should see contact_details"
    assert seller_details['buyer']['email'] == "buyer.test@vyaparsangam.com"
    assert seller_details['buyer']['phone'] == "+91 98765 43210"
    print(f"  PASS: Seller sees Buyer's contact -> Email: {seller_details['buyer']['email']}, Phone: {seller_details['buyer']['phone']}")

    print("\n[TEST 8] Buyer Notification on Acceptance:")
    buyer_notif = Notification.objects.filter(user=buyer, title__icontains='Contact Details Shared').first()
    assert buyer_notif is not None, "Buyer should receive notification on acceptance"
    print(f"  PASS: Buyer received notification: '{buyer_notif.title}' - '{buyer_notif.message}'")

    print("\n[TEST 9] Deal Details API Returns Contact Exchange:")
    req_deal = factory.get(f'/api/deals/{deal.id}/')
    force_authenticate(req_deal, user=buyer)
    res_deal = DealDetailView.as_view()(req_deal, pk=deal.id)
    assert res_deal.status_code == 200
    deal_ce = res_deal.data.get('contact_exchange')
    assert deal_ce is not None, "Deal serializer must include contact_exchange"
    assert deal_ce['status'] == 'shared'
    assert deal_ce['contact_details']['seller']['email'] == "seller.test@vyaparsangam.com"
    print("  PASS: Deal serializer directly embeds contact_exchange and unlocked contacts.")

    print("\n[TEST 10] Decline Workflow & Retry Rule:")
    # Reset to test decline workflow
    ContactExchange.objects.filter(deal=deal).delete()

    # Buyer initiates
    req_init2 = factory.post('/api/nda/contact-exchange/', {'deal_id': deal.id}, format='json')
    force_authenticate(req_init2, user=buyer)
    res_init2 = ContactExchangeListView.as_view()(req_init2)
    exchange2_id = res_init2.data['id']

    # Seller declines with reason
    req_dec = factory.post(f'/api/nda/contact-exchange/{exchange2_id}/decline/', {'reason': 'Let us do a site visit first.'}, format='json')
    force_authenticate(req_dec, user=seller)
    res_dec = ContactExchangeDeclineView.as_view()(req_dec, pk=exchange2_id)
    assert res_dec.status_code == 200
    assert res_dec.data['exchange']['status'] == 'declined'
    assert res_dec.data['exchange']['contact_details'] is None, "Contact details must be None when declined!"
    print("  PASS: Contact exchange marked 'declined'. Contact details remain completely confidential.")

    # Retry rule: Can request again after decline
    req_retry = factory.post('/api/nda/contact-exchange/', {'deal_id': deal.id}, format='json')
    force_authenticate(req_retry, user=buyer)
    res_retry = ContactExchangeListView.as_view()(req_retry)
    assert res_retry.status_code == 201, f"Expected 201 for retry request, got {res_retry.status_code}"
    assert res_retry.data['status'] == 'pending'
    print("  PASS: Retry rule permits new request after previous request was declined.")

    print("\n[TEST 11] Database Persistence Verification:")
    db_exchange = ContactExchange.objects.get(id=exchange2_id)
    assert db_exchange.deal_id == deal.id
    assert db_exchange.buyer == buyer
    assert db_exchange.seller == seller
    assert db_exchange.status == 'declined'
    assert db_exchange.declined_by == seller
    assert db_exchange.declined_at is not None
    assert db_exchange.decline_reason == 'Let us do a site visit first.'
    print("  PASS: Records, relations, reasons, and timestamps verified directly from PostgreSQL/DB.")

    print("\n" + "=" * 60)
    print("ALL 11 TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
