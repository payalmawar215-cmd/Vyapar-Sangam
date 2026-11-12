# Vyapar Sangam — Security & Production Deployment Audit

**Date:** November 12, 2026  
**Project:** Vyapar Sangam (Independent Full-Stack Application)  
**Target Environment:** Render Cloud Platform (Web Service + Managed PostgreSQL + Static Site)  
**Repository:** [https://github.com/payalmawar215-cmd/Vyapar-Sangam](https://github.com/payalmawar215-cmd/Vyapar-Sangam)  
**Audit Status:** **PASSED / PRODUCTION READY**

---

## 1. Executive Summary

A comprehensive production readiness, security, and deployment audit was conducted across the entire Vyapar Sangam codebase. All critical vulnerabilities, API inconsistencies, environment incompatibilities, path traversal vectors, basename collision vulnerabilities, and ephemeral storage issues have been identified, remediated, and verified with automated test suites.

- **Vulnerabilities Remediated:** 3 (Critical Privilege Escalation, High Insecure Media Access & Basename Collisions, High Path Traversal)
- **API Defects Resolved:** 1 (Password Reset Parameter Mismatch)
- **Production Enhancements Implemented:** WhiteNoise static asset pipeline, Gunicorn WSGI runtime, dynamic PostgreSQL connection via `dj-database-url`, SSL/Proxy headers, safe HSTS configuration, Render SPA redirect rules, and unified Render Blueprint (`render.yaml`).
- **Regression Test Coverage:** 33/33 Automated Tests Passed (100% Pass Rate).

---

## 2. Vulnerability Findings & Code Fixes

### 2.1 Critical: Admin Privilege Escalation via User Profile Update
- **Location:** `backend/apps/accounts/views.py` (`CurrentUserProfileView.patch`)
- **Severity:** **CRITICAL** (CVSS 9.1)
- **Description:**  
  Previously, any authenticated standard user (Buyer or Seller) could send a `PATCH` request to `/api/auth/profile/` or `/api/auth/me/` with `{"role": "ADMIN"}` or `{"app_role": "admin"}`. The view accepted any choice in `User.RoleChoices.choices`, immediately granting platform administrator privileges, full access to platform settings, unmoderated business approvals, and all user data.
- **Remediation:**
  1. Restricted normal self-service user role selection strictly to `[BUYER, SELLER]`.
  2. Implemented an explicit privilege check: if a non-admin attempts to set `role` or `app_role` to `ADMIN`, `STAFF`, or `SUPERUSER`, the request is immediately rejected with `HTTP 403 Forbidden` (`"Permission denied: Cannot assign administrator privileges."`).
  3. Sanitized input parsing against list and string formatting variants.
  4. Preserved administrative role delegation strictly via `AdminUserDetailView` (`/api/auth/admin/users/<pk>/`).
- **Verification:** Verified via Automated Tests 1, 2, 3, 4, 5, 6, 7, and 8.

### 2.2 High: Basename Collision & Insecure Media Access
- **Location:** `backend/apps/core/views.py` (`SecureMediaView`), `backend/vyapar_sangam/urls.py`
- **Severity:** **HIGH** (CVSS 7.8)
- **Description:**  
  Previously, document authorization matched records using `os.path.basename(target_path)`. This created a critical horizontal privilege escalation risk: if two separate sellers or buyers uploaded files with identical filenames (e.g. `confidential_registration.pdf` or `buyer_signature.png`), an unauthorized user could access another user's private document through the basename query.
- **Remediation:**
  1. Refactored `SecureMediaView` to query `BusinessVerificationDocument` and `InterestRequest` strictly by exact relative file path relative to `MEDIA_ROOT` (`file=rel_path` / `signature_file=rel_path`).
  2. Enforced strict ownership access control:
     - `verification_docs/`: Restricted to `doc.listing.owner` or platform admin (`HTTP 403` otherwise).
     - `signatures/`: Restricted to `req.buyer`, `req.listing.owner`, or platform admin (`HTTP 403` otherwise).
  3. Preserved unrestricted access to public media (`settings/posters/`, `settings/videos/`, etc.).
- **Verification:** Verified via Automated Tests 14–26 (specifically Tests 23–26 proving duplicate basenames on different records remain completely isolated).

### 2.3 High: Path & Directory Traversal Protection
- **Location:** `backend/apps/core/views.py` (`SecureMediaView`)
- **Severity:** **HIGH** (CVSS 7.5)
- **Description:**  
  Relying on simple string-prefix checks (e.g., `target_path.startswith(base_dir)`) is susceptible to path traversal, drive-letter escapes on Windows, leading-slash absolute path overrides, and symlink bypasses.
- **Remediation:**
  1. Implemented defense-in-depth sanitization: null-byte rejection, absolute path and drive-letter rejection (`startswith('/')` or drive colons).
  2. Resolved `media_root` and `target_path` via `pathlib.Path.resolve()`.
  3. Enforced dual containment verification using `Path.relative_to(media_root)` and `os.path.commonpath([str(media_root), str(target_path)]) == str(media_root)`.
  4. Blocked all Unix-style (`../`), deep (`../../`), and Windows-style (`..\`) traversal attempts with generic `HTTP 403 Forbidden` without exposing server paths.
- **Verification:** Verified via Automated Tests 27, 28, 29, 30, and 31.

### 2.4 Medium: Password Reset Parameter Incompatibility
- **Location:** `frontend/src/pages/Auth/ResetPasswordPage.jsx`, `frontend/src/services/authService.js`, `backend/apps/accounts/views.py`
- **Severity:** **MEDIUM**
- **Description:**  
  The React reset password form sent `{ new_password }`, whereas older backend and frontend code expected `{ password }` or `{ newPassword }`, causing password reset attempts to fail with `HTTP 400 Bad Request`.
- **Remediation:**
  1. Standardized backend `ResetPasswordConfirmView` to accept `password`, `new_password`, or `newPassword` interchangeably.
  2. Standardized frontend `authService.resetPassword` to forward all parameter variations.
  3. Added route aliases `api/auth/me/`, `api/auth/forgot-password/`, `api/auth/reset-password/`.
- **Verification:** Verified via Automated Tests 9, 10, 11, 12, and 13.

---

## 3. Production Configuration Enhancements

| Component | Setting | Implementation Details |
|---|---|---|
| **Static Files Pipeline** | `WhiteNoiseMiddleware` + `STORAGES` | Configured `whitenoise.storage.CompressedManifestStaticFilesStorage` for hashed and gzip/brotli compressed assets. Tested with 154 files copied and 444 post-processed. |
| **WSGI Server** | Gunicorn | Added `gunicorn>=21.2.0` to `requirements.txt`. Start command: `gunicorn vyapar_sangam.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120`. |
| **Database Connector** | `dj-database-url` | Automatically configures PostgreSQL from Render's `DATABASE_URL` with 10-minute connection pooling (`conn_max_age=600`) and health checks. |
| **Security Headers** | SSL & Safe HSTS | `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`, `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True`, `SECURE_BROWSER_XSS_FILTER = True`, `SECURE_CONTENT_TYPE_NOSNIFF = True`, `X_FRAME_OPTIONS = 'DENY'`, `SECURE_HSTS_SECONDS = 31536000`. Subdomain and preload enforcement safely default to `False` to prevent breaking non-HTTPS subdomains. |
| **CORS & CSRF** | Dynamic Origin Parsing | Parses `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` from environment variables with safe production fallbacks. |
| **Single Page App Routing** | Render SPA Fallback | Created `frontend/public/_redirects` (`/* /index.html 200`) and verified its inclusion in `dist/_redirects`. |

---

## 4. Test Suite Execution Results

Automated regression suite `backend/test_production_security.py` was executed directly against PostgreSQL:

```text
======================================================================
RUNNING VYAPAR SANGAM PRODUCTION SECURITY & DEPLOYMENT AUDIT TESTS
======================================================================

--- Group 1: Privilege Escalation Prevention ---
  [PASS] Test 1: Anonymous user cannot update profile (HTTP 401)
  [PASS] Test 2: Buyer cannot escalate role to ADMIN via role field (HTTP 403)
  [PASS] Test 3: Buyer role in database remains BUYER
  [PASS] Test 4: Buyer cannot escalate role to ADMIN via app_role alias (HTTP 403)
  [PASS] Test 5: Seller cannot escalate role to ADMIN (HTTP 403)
  [PASS] Test 6: Normal user can switch permitted role (BUYER <-> SELLER)
  [PASS] Test 7: Normal user can update permitted profile fields (HTTP 200)
  [PASS] Test 8: Admin user can manage user roles via admin endpoint (HTTP 200)

--- Group 2: Password Reset Compatibility & Flow ---
  [PASS] Test 9: Password reset request succeeds (HTTP 200)
  [PASS] Test 10: Password reset token generated and validated
  [PASS] Test 11: Password reset confirmed using 'new_password' field (HTTP 200)
  [PASS] Test 12: Old password rejected after reset (HTTP 400)
  [PASS] Test 13: New password successfully logs in (HTTP 200)

--- Group 3: Private Document Access Authorization & Collision Tests ---
  [PASS] Test 14: Anonymous user blocked from verification doc (HTTP 403)
  [PASS] Test 15: Unrelated user blocked from seller's verification doc (HTTP 403)
  [PASS] Test 16: Listing owner (seller 1) CAN access verification doc (HTTP 200)
  [PASS] Test 17: Platform admin CAN access verification doc (HTTP 200)
  [PASS] Test 18: Anonymous user blocked from NDA signature file (HTTP 403)
  [PASS] Test 19: Unrelated user blocked from NDA signature file (HTTP 403)
  [PASS] Test 20: Inquiry buyer (buyer 1) CAN access signature file (HTTP 200)
  [PASS] Test 21: Listing seller (seller 1) CAN access signature file (HTTP 200)
  [PASS] Test 22: Platform admin CAN access signature file (HTTP 200)

--- Group 4: Duplicate Basename Collision & Path Isolation ---
  [PASS] Test 23: Seller 1 blocked from Seller 2's doc despite identical basename (HTTP 403)
  [PASS] Test 24: Seller 2 CAN access their own doc (HTTP 200)
  [PASS] Test 25: Buyer 1 blocked from Buyer 2's signature despite identical basename (HTTP 403)
  [PASS] Test 26: Buyer 2 CAN access their own signature (HTTP 200)

--- Group 5: Traversal, Nonexistent File & Public Media ---
  [PASS] Test 27: Unix traversal `../settings.py` blocked (HTTP 403)
  [PASS] Test 28: Deep traversal `../../manage.py` blocked (HTTP 403)
  [PASS] Test 29: Windows backslash traversal `..\settings.py` blocked (HTTP 403)
  [PASS] Test 30: Absolute path attempt blocked (HTTP 403)
  [PASS] Test 31: Nonexistent file safely returns HTTP 404
  [PASS] Test 32: Public media accessible to anonymous user (HTTP 200)
  [PASS] Test 33: Public media accessible to authenticated user (HTTP 200)

======================================================================
RESULTS: 33/33 TESTS PASSED (100%)
======================================================================
```

---

## 5. Audit Verdict

**FINAL VERDICT: READY FOR PRODUCTION DEPLOYMENT**  
All prerequisites for zero-downtime, secure deployment on Render have been met with zero regressions and complete test validation.
