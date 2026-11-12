# Vyapar Sangam — Production Environment Variables Reference

This document defines all environment variables required for deploying Vyapar Sangam to production on Render or any standard cloud host.

---

## 1. Backend Service (`vyapar-sangam-backend`)

| Variable Name | Required? | Example / Default Value | Purpose |
|---|---|---|---|
| `DEBUG` | **Yes** | `False` | Disables debug mode. When `False`, Django enforces security checks and suppresses verbose error tracebacks. |
| `SECRET_KEY` | **Yes** | *(50-character random string)* | Used for cryptographic signing of sessions, auth tokens, and password reset hashes. Never commit to git. |
| `ALLOWED_HOSTS` | **Yes** | `.onrender.com,localhost,127.0.0.1` | Comma-separated host/domain names that this Django site can serve. |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/dbname` | Full PostgreSQL database connection URI provided automatically by Render Managed Postgres. |
| `DB_NAME` | Optional | `vyapar_db` | Fallback database name if `DATABASE_URL` is omitted. |
| `DB_USER` | Optional | `vyapar_user` | Fallback database username if `DATABASE_URL` is omitted. |
| `DB_PASSWORD` | Optional | `secure_password` | Fallback database password if `DATABASE_URL` is omitted. |
| `DB_HOST` | Optional | `localhost` | Fallback database host if `DATABASE_URL` is omitted. |
| `DB_PORT` | Optional | `5432` | Fallback database port if `DATABASE_URL` is omitted. |
| `CORS_ALLOWED_ORIGINS` | **Yes** | `https://vyapar-sangam.onrender.com` | Comma-separated origins authorized to make cross-origin requests from the React frontend. |
| `CSRF_TRUSTED_ORIGINS` | **Yes** | `https://vyapar-sangam.onrender.com,https://*.onrender.com` | Comma-separated list of origins trusted for unsafe HTTP requests (POST, PUT, PATCH, DELETE). |
| `SECURE_SSL_REDIRECT` | Optional | `True` | Automatically redirects all HTTP traffic to HTTPS. |
| `SECURE_HSTS_SECONDS` | Optional | `31536000` | HTTP Strict Transport Security header duration (1 year). |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | Optional | `False` | Enforce HSTS across all subdomains. Keep `False` unless every subdomain has verified HTTPS. |
| `SECURE_HSTS_PRELOAD` | Optional | `False` | Request browser HSTS preload list inclusion. Keep `False` unless domain meets strict preload criteria. |
| `EMAIL_BACKEND` | Optional | `django.core.mail.backends.smtp.EmailBackend` | Set to `django.core.mail.backends.console.EmailBackend` for testing, or SMTP backend for live emails. |
| `EMAIL_HOST` | Optional | `smtp.gmail.com` | SMTP host for sending verification emails and password reset links. |
| `EMAIL_PORT` | Optional | `587` | SMTP port (typically `587` for TLS). |
| `EMAIL_USE_TLS` | Optional | `True` | Whether to use TLS encryption when connecting to the SMTP server. |
| `EMAIL_HOST_USER` | Optional | `contact@vyaparsangam.com` | SMTP authentication username / sender email address. |
| `EMAIL_HOST_PASSWORD` | Optional | *(App password)* | SMTP authentication password or Gmail App Password. |
| `DEFAULT_FROM_EMAIL` | Optional | `Vyapar Sangam <noreply@vyaparsangam.com>` | Default 'From' header displayed on outgoing emails. |

---

## 2. Frontend Static Site (`vyapar-sangam-frontend`)

| Variable Name | Required? | Example / Default Value | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | `https://vyapar-sangam-backend.onrender.com/api` | Base API URL consumed by `axios` in `frontend/src/services/api.js`. Must include the `/api` suffix. |

---

## 3. Environment Variable Checklist

Before triggering your production build on Render, ensure:
- [x] `DEBUG` is set to `False`.
- [x] `SECRET_KEY` is generated and distinct from local development.
- [x] `DATABASE_URL` points to your managed PostgreSQL database.
- [x] `CORS_ALLOWED_ORIGINS` matches the exact frontend URL (including `https://`, no trailing slash).
- [x] `CSRF_TRUSTED_ORIGINS` includes both the frontend URL and `https://*.onrender.com`.
- [x] `VITE_API_BASE_URL` on the frontend points to the live backend service `/api` endpoint.
