# Vyapar Sangam — Render Deployment Guide

This guide provides end-to-end instructions for deploying the **Vyapar Sangam** application (React + Vite frontend, Django + DRF backend, and PostgreSQL database) to [Render](https://render.com/).

---

## Architecture Overview

```
                        ┌─────────────────────────────────┐
                        │          User's Browser         │
                        └───────────────┬─────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │   Vyapar Sangam Frontend    │  REST API     │    Vyapar Sangam Backend    │
  │    (Render Static Site)     ├──────────────►│    (Render Web Service)     │
  │ https://vyapar-sangam.      │   Calls       │ https://vyapar-backend.     │
  │        onrender.com         │               │        onrender.com         │
  └─────────────────────────────┘               └──────────────┬──────────────┘
                                                               │
                                                               ▼
                                                ┌─────────────────────────────┐
                                                │   Render Managed Postgres   │
                                                │      (Database Service)     │
                                                └─────────────────────────────┘
```

---

## Method 1: Automated Blueprint Deployment (Recommended)

A preconfigured [`render.yaml`](./render.yaml) blueprint file is provided at the root of the repository.

### Steps:
1. Push your code to your GitHub repository:
   ```bash
   git push origin main
   ```
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** > **Blueprint**.
4. Connect your GitHub repository: `payalmawar215-cmd/Vyapar-Sangam`.
5. Render will automatically parse `render.yaml` and discover:
   - **Database:** `vyapar-sangam-db` (PostgreSQL)
   - **Backend Web Service:** `vyapar-sangam-backend` (Python 3.11, Gunicorn, WhiteNoise)
   - **Frontend Static Site:** `vyapar-sangam-frontend` (React + Vite, SPA Rewrite rules)
6. Click **Apply**.
7. Render will provision the database, build the backend, run migrations, collect static assets, build the frontend, and deploy both services automatically!

---

## Method 2: Manual Step-by-Step Deployment

If you prefer to create each service individually via the Render UI:

### Step 1: Provision the PostgreSQL Database
1. Go to **Dashboard** > **New +** > **PostgreSQL**.
2. Configure settings:
   - **Name:** `vyapar-sangam-db`
   - **Database Name:** `vyapar_db`
   - **User:** `vyapar_user`
   - **Region:** Choose the region closest to your users (e.g., Singapore or Frankfurt).
   - **Instance Type:** `Free` (or Starter for high availability).
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g., `postgresql://vyapar_user:...@dpg-...-a/vyapar_db`).

---

### Step 2: Deploy the Django Backend Web Service
1. Go to **Dashboard** > **New +** > **Web Service**.
2. Connect your GitHub repository: `Vyapar-Sangam`.
3. Configure settings:
   - **Name:** `vyapar-sangam-backend`
   - **Region:** Same region as your PostgreSQL database.
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
     ```
   - **Start Command:**
     ```bash
     gunicorn vyapar_sangam.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
     ```
   - **Health Check Path:** `/api/categories/`
4. Add the following **Environment Variables**:
   | Key | Value | Description |
   |---|---|---|
   | `DEBUG` | `False` | Disables debug mode for security |
   | `SECRET_KEY` | *(Click "Generate" in Render)* | Cryptographically secure Django secret key |
   | `DATABASE_URL` | *(Paste Internal Database URL from Step 1)* | PostgreSQL connection string |
   | `ALLOWED_HOSTS` | `.onrender.com,localhost,127.0.0.1` | Permitted hostnames |
   | `CORS_ALLOWED_ORIGINS` | `https://vyapar-sangam.onrender.com` | Your frontend Static Site URL |
   | `CSRF_TRUSTED_ORIGINS` | `https://vyapar-sangam.onrender.com,https://*.onrender.com` | Permitted CSRF origins |
   | `SECURE_SSL_REDIRECT` | `True` | Enforces HTTPS |
   | `EMAIL_BACKEND` | `django.core.mail.backends.console.EmailBackend` *(or SMTP)* | Email delivery method |
5. Click **Create Web Service**.
6. Note your backend URL (e.g., `https://vyapar-sangam-backend.onrender.com`).

---

### Step 3: Deploy the React Frontend Static Site
1. Go to **Dashboard** > **New +** > **Static Site**.
2. Connect your GitHub repository: `Vyapar-Sangam`.
3. Configure settings:
   - **Name:** `vyapar-sangam`
   - **Root Directory:** `frontend`
   - **Build Command:**
     ```bash
     npm install && npm run build
     ```
   - **Publish Directory:** `dist`
4. Add the following **Environment Variable**:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://vyapar-sangam-backend.onrender.com/api` |
5. In **Redirects / Rewrites**, ensure SPA fallback is active (Render will automatically detect `dist/_redirects`, but you can also configure it in the UI):
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
6. Click **Create Static Site**.

---

## Step 4: Post-Deployment Verification

### 1. Create a Platform Superuser
Open the **Shell** tab on your `vyapar-sangam-backend` service in Render and execute:
```bash
python manage.py createsuperuser
```
Follow the prompts to enter an email, username, and secure password.

### 2. Verify System Health & API
Test the public API endpoints from your browser or terminal:
```bash
curl -I https://vyapar-sangam-backend.onrender.com/api/categories/
```
Expected response: `HTTP/2 200 OK`.

### 3. Verify CORS Connection
Open your frontend application in a browser:
- Open Developer Tools (F12) > **Console** and **Network**.
- Navigate between Listings, Categories, and Deals.
- Verify that API calls return `200 OK` without CORS error headers.

---

## Step 5: Persistent Media Storage Strategy for Private Uploads

Render Web Services utilize an **ephemeral filesystem** by default: local files stored in `backend/media/` are wiped whenever a service is restarted or redeployed. 

Because **business verification documents** (tax records, registration certificates) and **NDA signatures** are confidential legal documents, they must be permanently retained **without ever exposing them to public buckets or unauthenticated URLs**.

### Approach 1: Render Persistent Disk (Simplest & Direct)
Render provides persistent block storage directly attachable to web services:
1. In the Render Dashboard for `vyapar-sangam-backend`, navigate to **Disks** > **Add Disk**.
2. Configure settings:
   - **Name:** `vyapar-media-disk`
   - **Mount Path:** `/opt/render/project/src/backend/media`
   - **Size:** 1 GB – 10 GB (expandable at any time).
3. **Security Benefits:**
   - Files are stored on dedicated block storage retained across all deploys and restarts.
   - All access passes exclusively through Django's `SecureMediaView` (`/media/<path:file_path>`), enforcing strict ownership and admin authorization checks.
   - Private documents are never uploaded to the public internet or exposed via third-party CDNs.

---

### Approach 2: Dedicated Private Cloud Object Storage (AWS S3)
If scaling horizontally across multiple web instances, configure private AWS S3 storage:
1. Create an AWS S3 bucket with **Block ALL Public Access** strictly enabled.
2. Ensure default bucket ACL is `private` and bucket policy denies unauthenticated `s3:GetObject`.
3. Add `django-storages` and `boto3` to `requirements.txt`:
   ```bash
   pip install django-storages boto3
   ```
4. Configure Django settings for private media storage:
   ```python
   # vyapar_sangam/settings.py
   if os.getenv('USE_AWS_S3', 'False').lower() in ('true', '1'):
       AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
       AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
       AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
       AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'ap-south-1')
       AWS_DEFAULT_ACL = 'private'
       AWS_QUERYSTRING_AUTH = True  # Generates expiring pre-signed URLs (e.g., valid for 15 minutes)
       AWS_QUERYSTRING_EXPIRE = 900
       DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
   ```
5. **Security Benefits:**
   - Private documents cannot be read or downloaded by anyone possessing only the file URL.
   - Files are accessed only via time-limited, cryptographically signed pre-signed URLs generated after user authorization, or streamed via backend `SecureMediaView`.

