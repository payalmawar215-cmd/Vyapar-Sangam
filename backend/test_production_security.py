"""
Automated Production Security, Privilege Escalation & Deployment Regression Suite
Vyapar Sangam Independent Application
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vyapar_sangam.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status
from apps.listings.models import BusinessListing, Category, BusinessVerificationDocument
from apps.inquiries.models import InterestRequest

User = get_user_model()

def run_tests():
    client = APIClient()
    passed = 0
    total = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] Test {total}: {name}")
        else:
            print(f"  [FAIL] Test {total}: {name} - Details: {details}")

    print("\n" + "=" * 70)
    print("RUNNING VYAPAR SANGAM PRODUCTION SECURITY & DEPLOYMENT AUDIT TESTS")
    print("=" * 70)

    # Clean test users if they exist
    User.objects.filter(username__in=[
        'sec_buyer',
        'sec_seller',
        'sec_seller2',
        'sec_buyer2',
        'sec_admin',
        'sec_unrelated'
    ]).delete()

    # Create test users
    buyer = User.objects.create_user(
        username='sec_buyer',
        email='sec_buyer@example.com',
        password='OldPassword123!',
        first_name='SecBuyer',
        last_name='User',
        role='BUYER',
        phone_number='+919876543210'
    )
    buyer2 = User.objects.create_user(
        username='sec_buyer2',
        email='sec_buyer2@example.com',
        password='Buyer2Password123!',
        first_name='SecBuyer2',
        last_name='User',
        role='BUYER',
        phone_number='+919876543219'
    )
    seller = User.objects.create_user(
        username='sec_seller',
        email='sec_seller@example.com',
        password='SellerPassword123!',
        first_name='SecSeller',
        last_name='User',
        role='SELLER',
        phone_number='+919876543211'
    )
    seller2 = User.objects.create_user(
        username='sec_seller2',
        email='sec_seller2@example.com',
        password='Seller2Password123!',
        first_name='SecSeller2',
        last_name='User',
        role='SELLER',
        phone_number='+919876543218'
    )
    unrelated_user = User.objects.create_user(
        username='sec_unrelated',
        email='sec_unrelated@example.com',
        password='UnrelatedPassword123!',
        first_name='SecUnrelated',
        last_name='User',
        role='BUYER',
        phone_number='+919876543212'
    )
    admin_user = User.objects.create_superuser(
        username='sec_admin',
        email='sec_admin@example.com',
        password='AdminPassword123!',
        first_name='SecAdmin',
        last_name='User',
        role='ADMIN',
        phone_number='+919876543213'
    )

    category, _ = Category.objects.get_or_create(name="Security Testing Category", defaults={"slug": "sec-cat"})

    # --------------------------------------------------------------------------
    # GROUP 1: PRIVILEGE ESCALATION PREVENTION
    # --------------------------------------------------------------------------
    print("\n--- Group 1: Privilege Escalation Prevention ---")

    # Test 1: Anonymous cannot update profile
    client.force_authenticate(user=None)
    res = client.patch('/api/auth/me/', {'first_name': 'Hacker'})
    assert_test("Anonymous user cannot update profile (HTTP 401)", res.status_code == status.HTTP_401_UNAUTHORIZED)

    # Test 2: Normal buyer cannot escalate role to ADMIN
    client.force_authenticate(user=buyer)
    res = client.patch('/api/auth/me/', {'role': 'ADMIN'})
    assert_test(
        "Buyer cannot escalate role to ADMIN via role field (HTTP 403)",
        res.status_code == status.HTTP_403_FORBIDDEN and 'Permission denied' in str(res.data)
    )
    buyer.refresh_from_db()
    assert_test("Buyer role in database remains BUYER", buyer.role == 'BUYER')

    # Test 4: Normal buyer cannot escalate role via app_role
    res = client.patch('/api/auth/me/', {'app_role': 'admin'})
    assert_test(
        "Buyer cannot escalate role to ADMIN via app_role alias (HTTP 403)",
        res.status_code == status.HTTP_403_FORBIDDEN,
        f"Status: {res.status_code}, Data: {res.data}"
    )

    # Test 4: Normal seller cannot escalate role to ADMIN
    client.force_authenticate(user=seller)
    res = client.patch('/api/auth/me/', {'role': 'ADMIN'})
    assert_test("Seller cannot escalate role to ADMIN (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 5: Buyer can switch permitted role to SELLER
    client.force_authenticate(user=buyer)
    res = client.patch('/api/auth/me/', {'role': 'SELLER'})
    buyer.refresh_from_db()
    assert_test("Normal user can switch permitted role (BUYER <-> SELLER)", res.status_code == status.HTTP_200_OK and buyer.role == 'SELLER')
    # Switch back to BUYER
    client.patch('/api/auth/me/', {'role': 'BUYER'})
    buyer.refresh_from_db()

    # Test 6: Normal user can update standard profile fields
    res = client.patch('/api/auth/me/', {'bio': 'Certified Investor', 'city': 'Mumbai'})
    buyer.refresh_from_db()
    assert_test(
        "Normal user can update permitted profile fields (HTTP 200)",
        res.status_code == status.HTTP_200_OK and buyer.bio == 'Certified Investor'
    )

    # Test 7: Admin can manage roles
    client.force_authenticate(user=admin_user)
    res = client.patch(f'/api/auth/admin/users/{buyer.id}/', {'role': 'BUYER'})
    assert_test("Admin user can manage user roles via admin endpoint (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # --------------------------------------------------------------------------
    # GROUP 2: PASSWORD RESET WORKFLOW (new_password compatibility)
    # --------------------------------------------------------------------------
    print("\n--- Group 2: Password Reset Compatibility & Flow ---")

    # Test 8: Request password reset token
    client.force_authenticate(user=None)
    res = client.post('/api/auth/forgot-password/', {'email': 'sec_buyer@example.com'})
    assert_test("Password reset request succeeds (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Generate or extract the reset token
    uid_b64 = urlsafe_base64_encode(force_bytes(buyer.pk))
    token = default_token_generator.make_token(buyer)
    reset_token = f"{uid_b64}__{token}"
    assert_test("Password reset token generated and validated", default_token_generator.check_token(buyer, token))

    # Test 9: Confirm reset using new_password field (matching React form payload)
    new_secret_pwd = "BrandNewSecurePassword456!"
    res = client.post('/api/auth/reset-password/', {
        'token': reset_token,
        'new_password': new_secret_pwd
    })
    assert_test(
        "Password reset confirmed using 'new_password' field (HTTP 200)",
        res.status_code == status.HTTP_200_OK and 'successfully' in str(res.data)
    )

    # Test 10: Old password must be invalid
    res_old = client.post('/api/auth/login/', {
        'email': 'sec_buyer@example.com',
        'password': 'OldPassword123!'
    })
    assert_test("Old password rejected after reset (HTTP 400)", res_old.status_code == status.HTTP_400_BAD_REQUEST)

    # Test 11: New password must authenticate successfully
    res_new = client.post('/api/auth/login/', {
        'email': 'sec_buyer@example.com',
        'password': new_secret_pwd
    })
    assert_test("New password successfully logs in (HTTP 200)", res_new.status_code == status.HTTP_200_OK and 'token' in res_new.data)

    # --------------------------------------------------------------------------
    # --------------------------------------------------------------------------
    # GROUP 3: PRIVATE MEDIA ACCESS CONTROL & COLLISION TESTS
    # --------------------------------------------------------------------------
    print("\n--- Group 3: Private Document Access Authorization & Collision Tests ---")

    # Create listing 1 (owned by seller 1)
    listing = BusinessListing.objects.create(
        owner=seller,
        title="Secured Enterprise Ltd",
        category=category,
        asking_price=5000000,
        city="Pune",
        state="Maharashtra",
        status="ACTIVE"
    )

    # Create listing 2 (owned by seller 2)
    listing2 = BusinessListing.objects.create(
        owner=seller2,
        title="Alpha Retail Ventures",
        category=category,
        asking_price=7500000,
        city="Mumbai",
        state="Maharashtra",
        status="ACTIVE"
    )

    # Create dummy verification document file 1 (Seller 1)
    doc_content = b"%PDF-1.4 Private Business Registration Certificate Seller 1"
    doc_file = SimpleUploadedFile("confidential_registration.pdf", doc_content, content_type="application/pdf")
    verification_doc = BusinessVerificationDocument.objects.create(
        listing=listing,
        document_type="BUSINESS_REGISTRATION",
        title="Registration Doc Seller 1",
        file=doc_file,
        file_name="confidential_registration.pdf"
    )

    # Create dummy verification document file 2 (Seller 2) with IDENTICAL basename
    doc_content2 = b"%PDF-1.4 Private Business Registration Certificate Seller 2"
    doc_file2 = SimpleUploadedFile("confidential_registration.pdf", doc_content2, content_type="application/pdf")
    verification_doc2 = BusinessVerificationDocument.objects.create(
        listing=listing2,
        document_type="BUSINESS_REGISTRATION",
        title="Registration Doc Seller 2",
        file=doc_file2,
        file_name="confidential_registration.pdf"
    )

    # Create interest request 1 (Buyer 1 for Listing 1)
    sig_content = b"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    sig_file = SimpleUploadedFile("buyer_signature.png", sig_content, content_type="image/png")
    inquiry = InterestRequest.objects.create(
        buyer=buyer,
        listing=listing,
        buyer_name="SecBuyer User",
        buyer_phone="+919876543210",
        message="Interested in acquiring",
        signature_file=sig_file,
        nda_signed=True
    )

    # Create interest request 2 (Buyer 2 for Listing 2) with IDENTICAL basename
    sig_content2 = b"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    sig_file2 = SimpleUploadedFile("buyer_signature.png", sig_content2, content_type="image/png")
    inquiry2 = InterestRequest.objects.create(
        buyer=buyer2,
        listing=listing2,
        buyer_name="SecBuyer2 User",
        buyer_phone="+919876543219",
        message="Interested in acquiring Ventures",
        signature_file=sig_file2,
        nda_signed=True
    )

    # Create a public media file (e.g., settings/posters/public_overview.png)
    public_media_dir = os.path.join(str(settings.MEDIA_ROOT), "settings", "posters")
    os.makedirs(public_media_dir, exist_ok=True)
    public_file_path = os.path.join(public_media_dir, "public_overview.png")
    with open(public_file_path, "wb") as pf:
        pf.write(b"\x89PNG\r\n\x1a\nPublic Media Poster Image Bytes")

    doc_relative_path = verification_doc.file.name.replace('\\', '/')
    doc2_relative_path = verification_doc2.file.name.replace('\\', '/')
    sig_relative_path = inquiry.signature_file.name.replace('\\', '/')
    sig2_relative_path = inquiry2.signature_file.name.replace('\\', '/')

    # Test 14: Anonymous user cannot access verification doc
    client.force_authenticate(user=None)
    res = client.get(f'/media/{doc_relative_path}')
    assert_test("Anonymous user blocked from verification doc (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 15: Unrelated user cannot access verification doc
    client.force_authenticate(user=unrelated_user)
    res = client.get(f'/media/{doc_relative_path}')
    assert_test("Unrelated user blocked from seller's verification doc (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 16: Seller (owner) CAN access verification doc
    client.force_authenticate(user=seller)
    res = client.get(f'/media/{doc_relative_path}')
    assert_test("Listing owner (seller 1) CAN access verification doc (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Test 17: Admin CAN access verification doc
    client.force_authenticate(user=admin_user)
    res = client.get(f'/media/{doc_relative_path}')
    assert_test("Platform admin CAN access verification doc (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Test 18: Anonymous user blocked from signature file
    client.force_authenticate(user=None)
    res = client.get(f'/media/{sig_relative_path}')
    assert_test("Anonymous user blocked from NDA signature file (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 19: Unrelated user blocked from NDA signature file
    client.force_authenticate(user=unrelated_user)
    res = client.get(f'/media/{sig_relative_path}')
    assert_test("Unrelated user blocked from NDA signature file (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 20: Buyer who signed CAN access their signature file
    client.force_authenticate(user=buyer)
    res = client.get(f'/media/{sig_relative_path}')
    assert_test("Inquiry buyer (buyer 1) CAN access signature file (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Test 21: Listing seller party to NDA CAN access signature file
    client.force_authenticate(user=seller)
    res = client.get(f'/media/{sig_relative_path}')
    assert_test("Listing seller (seller 1) CAN access signature file (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Test 22: Platform admin CAN access NDA signature file
    client.force_authenticate(user=admin_user)
    res = client.get(f'/media/{sig_relative_path}')
    assert_test("Platform admin CAN access signature file (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # --------------------------------------------------------------------------
    # GROUP 4: DUPLICATE BASENAME COLLISION & PATH ISOLATION TESTS
    # --------------------------------------------------------------------------
    print("\n--- Group 4: Duplicate Basename Collision & Path Isolation ---")

    # Test 23: Seller 1 CANNOT access Seller 2's doc even with same basename
    client.force_authenticate(user=seller)
    res = client.get(f'/media/{doc2_relative_path}')
    assert_test("Seller 1 blocked from Seller 2's doc despite identical basename (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 24: Seller 2 CAN access their own doc
    client.force_authenticate(user=seller2)
    res = client.get(f'/media/{doc2_relative_path}')
    assert_test("Seller 2 CAN access their own doc (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Test 25: Buyer 1 CANNOT access Buyer 2's signature despite identical basename
    client.force_authenticate(user=buyer)
    res = client.get(f'/media/{sig2_relative_path}')
    assert_test("Buyer 1 blocked from Buyer 2's signature despite identical basename (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 26: Buyer 2 CAN access their own signature
    client.force_authenticate(user=buyer2)
    res = client.get(f'/media/{sig2_relative_path}')
    assert_test("Buyer 2 CAN access their own signature (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # --------------------------------------------------------------------------
    # GROUP 5: DIRECTORY TRAVERSAL & NONEXISTENT FILE TESTS
    # --------------------------------------------------------------------------
    print("\n--- Group 5: Traversal, Nonexistent File & Public Media ---")

    # Test 27: Unix-style traversal blocked
    client.force_authenticate(user=buyer)
    res = client.get('/media/../settings.py')
    assert_test("Unix traversal `../settings.py` blocked (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 28: Deep Unix traversal blocked
    res = client.get('/media/../../manage.py')
    assert_test("Deep traversal `../../manage.py` blocked (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 29: Windows backslash traversal blocked
    res = client.get('/media/..\\settings.py')
    assert_test("Windows backslash traversal `..\\settings.py` blocked (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 30: Absolute path attempt blocked
    res = client.get('/media//etc/passwd')
    assert_test("Absolute path attempt blocked (HTTP 403)", res.status_code == status.HTTP_403_FORBIDDEN)

    # Test 31: Nonexistent file returns 404
    res = client.get('/media/completely_nonexistent_file_987654.pdf')
    assert_test("Nonexistent file safely returns HTTP 404", res.status_code == status.HTTP_404_NOT_FOUND)

    # Test 32: Public media accessible by anonymous user
    client.force_authenticate(user=None)
    res = client.get('/media/settings/posters/public_overview.png')
    assert_test("Public media accessible to anonymous user (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Test 33: Public media accessible by authenticated user
    client.force_authenticate(user=buyer)
    res = client.get('/media/settings/posters/public_overview.png')
    assert_test("Public media accessible to authenticated user (HTTP 200)", res.status_code == status.HTTP_200_OK)

    # Clean up test files
    for obj_file in [verification_doc.file, verification_doc2.file, inquiry.signature_file, inquiry2.signature_file]:
        try:
            if obj_file and os.path.exists(obj_file.path):
                os.remove(obj_file.path)
        except Exception:
            pass

    if os.path.exists(public_file_path):
        try:
            os.remove(public_file_path)
        except Exception:
            pass

    # Clean up DB
    inquiry.delete()
    inquiry2.delete()
    verification_doc.delete()
    verification_doc2.delete()
    listing.delete()
    listing2.delete()
    category.delete()
    buyer.delete()
    buyer2.delete()
    seller.delete()
    seller2.delete()
    unrelated_user.delete()
    admin_user.delete()

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed}/{total} TESTS PASSED")
    print("=" * 70)
    return passed == total

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
