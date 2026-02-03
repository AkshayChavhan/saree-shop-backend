# Saree Shop Backend - GCP Deployment Guide (Express.js)

## 🎯 Quick Answer: Your GCP URLs

After deployment, your backend will be available at:

| Environment | URL |
|-------------|-----|
| **Production** | `https://PROJECT_ID.appspot.com` |
| **Staging** | `https://staging-dot-PROJECT_ID.appspot.com` |

Replace `PROJECT_ID` with your actual GCP project ID (e.g., `saree-shop-backend-123456`)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [GCP Project Setup](#gcp-project-setup)
3. [Environment Variables Setup](#environment-variables-setup)
4. [App Engine Configuration](#app-engine-configuration)
5. [Manual Deployment](#manual-deployment)
6. [Automated Deployment (GitHub Actions)](#automated-deployment)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Verification & Testing](#verification-testing)

---

## Prerequisites

### ✅ Before You Start

- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed (optional for manual deployment)
- [ ] Git repository for your backend
- [ ] MongoDB database (MongoDB Atlas)
- [ ] Clerk account for authentication
- [ ] Payment gateway accounts (Stripe, Razorpay) - optional

---

## GCP Project Setup

### Step 1: Create GCP Project

1. Go to: https://console.cloud.google.com/projectcreate
2. **Project name**: `saree-shop-backend`
3. **Project ID**: Note this! (e.g., `saree-shop-backend-123456`)
4. Click **Create**

### Step 2: Enable Billing

1. Go to: https://console.cloud.google.com/billing
2. Link a billing account
3. **Note**: App Engine has a generous free tier

### Step 3: Enable Required APIs

Go to: https://console.cloud.google.com/apis/library

Enable these APIs:
- ✅ **App Engine Admin API**
- ✅ **Cloud Build API**
- ✅ **Secret Manager API** (for secure env variables)
- ✅ **Cloud Resource Manager API**

### Step 4: Initialize App Engine

1. Go to: https://console.cloud.google.com/appengine
2. Click **Create Application**
3. **Select region**:
   - `asia-south1` (Mumbai) - Best for India
   - `us-central1` - USA
   - `europe-west1` - Europe
4. **Environment**: Select **Standard**
5. Click **Next** → **I'll do this later**

---

## Environment Variables Setup

### Option A: Google Secret Manager (Recommended for Production)

#### Step 1: Enable Secret Manager API

Already done in prerequisites above.

#### Step 2: Create Secrets

Go to: https://console.cloud.google.com/security/secret-manager

Click **+ CREATE SECRET** for each variable:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `MASTER_API_KEY` | Your generated 64-char hex key | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | MongoDB connection string | MongoDB Atlas → Databases → Connect |
| `CLERK_SECRET_KEY` | `sk_live_xxxxx` or `sk_test_xxxxx` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | `whsec_xxxxx` | Clerk Dashboard → Webhooks |
| `STRIPE_SECRET_KEY` | `sk_live_xxxxx` or `sk_test_xxxxx` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx` | Stripe Dashboard → Developers → Webhooks |
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxx` or `rzp_test_xxxxx` | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Your Razorpay webhook secret | Razorpay Dashboard → Settings → Webhooks |
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | Your API key | Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | Your API secret | Cloudinary Dashboard |
| `FRONTEND_URL` | Your frontend URL | `https://your-frontend-domain.com` |

For each secret:
- **Name**: Enter the exact variable name (e.g., `MASTER_API_KEY`)
- **Secret value**: Paste the actual value
- **Regions**: Leave as "Automatic"
- Click **CREATE SECRET**

#### Step 3: Grant App Engine Access to Secrets

1. Go to: https://console.cloud.google.com/iam-admin/iam
2. Find: `YOUR_PROJECT_ID@appspot.gserviceaccount.com` (App Engine default service account)
3. Click **Edit** (pencil icon)
4. Click **+ ADD ANOTHER ROLE**
5. Add role: **Secret Manager Secret Accessor**
6. Click **Save**

---

### Option B: Direct in app.yaml (Quick Setup - Less Secure)

⚠️ **Warning**: This exposes secrets in your code repository. Only use for development/testing!

You can add variables directly in `app.yaml` (shown in next section).

---

## App Engine Configuration

### Create app.yaml (Production)

Create this file in your project root:

```yaml
# /home/l910009/Desktop/saree-shop-backend/app.yaml

runtime: nodejs20
service: default
instance_class: F2

# Environment variables
env_variables:
  NODE_ENV: production
  PORT: 8080  # App Engine uses port 8080
  BYPASS_MASTER_KEY: false

# If using Option B (not recommended for production):
# Uncomment and add your actual values
#  MASTER_API_KEY: "your-actual-master-key-here"
#  DATABASE_URL: "mongodb+srv://user:pass@cluster.mongodb.net/saakie"
#  CLERK_SECRET_KEY: "sk_live_xxxxx"
#  CLERK_WEBHOOK_SECRET: "whsec_xxxxx"
#  FRONTEND_URL: "https://your-frontend.com"
#  CLOUDINARY_CLOUD_NAME: "your-cloud-name"
#  CLOUDINARY_API_KEY: "your-api-key"
#  CLOUDINARY_API_SECRET: "your-api-secret"

# If using Option A (Secret Manager):
# Secrets will be loaded at runtime using @google-cloud/secret-manager

# Scaling configuration
automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.65

# Handlers
handlers:
  - url: /.*
    script: auto
    secure: always
```

### Create app.staging.yaml (Optional - Staging Environment)

```yaml
# /home/l910009/Desktop/saree-shop-backend/app.staging.yaml

runtime: nodejs20
service: staging
instance_class: F1

env_variables:
  NODE_ENV: staging
  PORT: 8080
  BYPASS_MASTER_KEY: false

automatic_scaling:
  min_instances: 0  # Can scale to zero to save costs
  max_instances: 2

handlers:
  - url: /.*
    script: auto
    secure: always
```

### Create .gcloudignore

```bash
# /home/l910009/Desktop/saree-shop-backend/.gcloudignore

.git
.gitignore
node_modules/
.env
.env.*
*.log
coverage/
.nyc_output/
*.md
tests/
__tests__/
.vscode/
.idea/
*.log
npm-debug.log*
.DS_Store
```

### Update package.json Scripts

Add deployment scripts:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:studio": "prisma studio",
    "deploy:staging": "gcloud app deploy app.staging.yaml --quiet",
    "deploy:prod": "gcloud app deploy app.yaml --quiet"
  }
}
```

---

## Manual Deployment

### Step 1: Install Google Cloud CLI

**Mac:**
```bash
brew install google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Windows:**
Download from: https://cloud.google.com/sdk/docs/install

### Step 2: Authenticate

```bash
gcloud auth login
```

### Step 3: Set Project

```bash
gcloud config set project YOUR_PROJECT_ID
```

### Step 4: Build and Deploy

```bash
# Build TypeScript
npm run build

# Generate Prisma client
npm run prisma:generate

# Deploy to production
gcloud app deploy app.yaml --quiet

# Or deploy to staging
gcloud app deploy app.staging.yaml --quiet
```

### Step 5: View Your App

```bash
# Open in browser
gcloud app browse

# View logs
gcloud app logs tail -s default

# View staging logs
gcloud app logs tail -s staging
```

---

## Automated Deployment (GitHub Actions)

### Step 1: Create Service Account

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **+ CREATE SERVICE ACCOUNT**
3. **Name**: `github-deploy`
4. **Description**: `Service account for GitHub Actions`
5. Click **CREATE AND CONTINUE**

### Step 2: Grant Permissions

Add these roles:
- ✅ **App Engine Deployer**
- ✅ **App Engine Service Admin**
- ✅ **Cloud Build Editor**
- ✅ **Service Account User**
- ✅ **Secret Manager Secret Accessor** (if using Secret Manager)

Click **CONTINUE** → **DONE**

### Step 3: Create Key

1. Click on `github-deploy` service account
2. Go to **Keys** tab
3. Click **ADD KEY** → **Create new key**
4. Select **JSON**
5. Click **CREATE** (downloads key file)

### Step 4: Encode Key

```bash
# Mac/Linux
base64 -w 0 ~/Downloads/saree-shop-backend-xxxxx.json

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\key.json"))
```

Copy the output.

### Step 5: Add GitHub Secrets

Go to: `Repository → Settings → Secrets and variables → Actions`

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Base64 encoded service account key (from Step 4) |

### Step 6: Create GitHub Workflow

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main  # or 'master' depending on your default branch

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Generate Prisma Client
        run: npm run prisma:generate

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Deploy to App Engine
        run: gcloud app deploy app.yaml --quiet --promote
```

### Step 7: Create Staging Workflow (Optional)

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - dev

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Generate Prisma Client
        run: npm run prisma:generate

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Deploy to Staging
        run: gcloud app deploy app.staging.yaml --quiet --promote
```

---

## Environment Variables Reference

### Complete List with Sources

Here's where to get each environment variable value:

#### 1. MASTER_API_KEY
**Source**: Generate yourself
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Example**: `6c9f64aabd5bb80cca352ce4a7eab38a6759e104e698a6c057b31f80a76602c8`
**Used for**: Backend API authentication (all API calls must include this)

#### 2. DATABASE_URL
**Source**: MongoDB Atlas
1. Go to: https://cloud.mongodb.com/
2. Click on your cluster → **Connect** → **Connect your application**
3. Copy the connection string
4. Replace `<password>` with your database password
**Example**: `mongodb+srv://user:password@cluster0.mongodb.net/saakie?retryWrites=true&w=majority`

#### 3. CLERK_SECRET_KEY
**Source**: Clerk Dashboard
1. Go to: https://dashboard.clerk.com/
2. Select your application
3. **Configure** → **API Keys**
4. Copy **Secret Key**
**Example**: `sk_live_xxxxx` (production) or `sk_test_xxxxx` (development)

#### 4. CLERK_WEBHOOK_SECRET
**Source**: Clerk Dashboard
1. **Configure** → **Webhooks**
2. Click **+ Add Endpoint**
3. **Endpoint URL**: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/clerk`
4. **Subscribe to events**: `user.created`, `user.updated`, `user.deleted`
5. Copy **Signing Secret**
**Example**: `whsec_xxxxx`

#### 5. STRIPE_SECRET_KEY (Optional)
**Source**: Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key**
**Example**: `sk_test_xxxxx` (test) or `sk_live_xxxxx` (production)

#### 6. STRIPE_WEBHOOK_SECRET (Optional)
**Source**: Stripe Dashboard
1. **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. **Endpoint URL**: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/stripe`
4. **Events**: Select `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy **Signing secret**
**Example**: `whsec_xxxxx`

#### 7. RAZORPAY_KEY_ID (Optional)
**Source**: Razorpay Dashboard
1. Go to: https://dashboard.razorpay.com/app/keys
2. Copy **Key ID**
**Example**: `rzp_test_xxxxx` (test) or `rzp_live_xxxxx` (live)

#### 8. RAZORPAY_KEY_SECRET (Optional)
**Source**: Razorpay Dashboard
1. Same location as Key ID
2. Copy **Key Secret**
**Example**: Long alphanumeric string

#### 9. RAZORPAY_WEBHOOK_SECRET (Optional)
**Source**: Razorpay Dashboard
1. **Settings** → **Webhooks**
2. Create webhook with URL: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/razorpay`
3. Copy **Secret**

#### 10. CLOUDINARY_CLOUD_NAME
**Source**: Cloudinary Dashboard
1. Go to: https://cloudinary.com/console
2. **Dashboard** - Find **Cloud name**
**Example**: `doilfcjxb`

#### 11. CLOUDINARY_API_KEY
**Source**: Cloudinary Dashboard
1. Same location
2. Find **API Key**
**Example**: `755529198772159`

#### 12. CLOUDINARY_API_SECRET
**Source**: Cloudinary Dashboard
1. Same location
2. Find **API Secret** (click to reveal)
**Example**: `B4NbJUUA-Mdo0UhNxp9A_4Ysarg`

#### 13. FRONTEND_URL
**Source**: Your frontend deployment
**Example**:
- Production: `https://your-domain.com`
- Staging: `https://staging.your-domain.com`
- Development: `http://localhost:3000`

#### 14. PORT
**Source**: Fixed for App Engine
**Value**: `8080` (App Engine requirement)
**Note**: Already set in app.yaml, don't add to secrets

#### 15. NODE_ENV
**Source**: Set based on environment
**Values**: `production`, `staging`, or `development`
**Note**: Already set in app.yaml

#### 16. BYPASS_MASTER_KEY
**Source**: Configuration choice
**Values**: `false` (production), `true` (local dev only)
**Recommendation**: Always `false` in production

---

## Verification & Testing

### Step 1: Check Deployment Status

```bash
gcloud app versions list
```

### Step 2: Test Your API

```bash
# Production URL
curl -H "X-API-Key: YOUR_MASTER_KEY" https://YOUR_PROJECT_ID.appspot.com/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-03T...","environment":"production"}
```

### Step 3: Test Products Endpoint

```bash
curl -H "X-API-Key: YOUR_MASTER_KEY" https://YOUR_PROJECT_ID.appspot.com/api/products
```

### Step 4: View Logs

```bash
# Real-time logs
gcloud app logs tail -s default

# Specific service
gcloud app logs tail -s staging
```

### Step 5: Monitor App

Go to: https://console.cloud.google.com/appengine/services

---

## Frontend Integration

Update your frontend `.env` file:

```env
# Frontend .env or .env.production
NEXT_PUBLIC_API_URL=https://YOUR_PROJECT_ID.appspot.com
NEXT_PUBLIC_MASTER_API_KEY=your-master-key-here
```

Update API calls to include master key:

```typescript
// Frontend API utility
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MASTER_KEY = process.env.NEXT_PUBLIC_MASTER_API_KEY;

export async function fetchProducts() {
  const response = await fetch(`${API_URL}/api/products`, {
    headers: {
      'X-API-Key': MASTER_KEY!,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}
```

---

## Troubleshooting

### Issue: Build Fails

```bash
# Clear and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Deployment Fails

Check:
1. ✅ App Engine API enabled?
2. ✅ Service account has correct roles?
3. ✅ Billing account linked?
4. ✅ app.yaml syntax correct?

### Issue: App Not Responding

Check logs:
```bash
gcloud app logs tail -s default
```

Look for:
- Environment variable errors
- Database connection errors
- Port binding issues (should be 8080)

### Issue: Database Connection Fails

1. Check MongoDB Atlas network access
2. Add GCP to IP whitelist: `0.0.0.0/0` (or specific GCP IPs)
3. Verify DATABASE_URL is correct

---

## Cost Optimization

### Free Tier Limits
- **28 instance hours/day** for F1 instance
- **1 GB outbound traffic/day**
- **5 GB Cloud Storage**

### Tips to Stay in Free Tier
1. Use F1 instance class
2. Set min_instances to 0 for staging
3. Use Cloud Scheduler to stop staging at night
4. Monitor usage: https://console.cloud.google.com/billing

---

## Quick Reference Commands

```bash
# Deploy
gcloud app deploy app.yaml --quiet

# View app
gcloud app browse

# View logs
gcloud app logs tail -s default

# List versions
gcloud app versions list

# Stop version (save costs)
gcloud app versions stop VERSION_ID

# Delete old versions
gcloud app versions delete VERSION_ID
```

---

## Summary

After following this guide, you will have:

✅ Backend deployed to GCP App Engine
✅ Production URL: `https://YOUR_PROJECT_ID.appspot.com`
✅ Staging URL: `https://staging-dot-YOUR_PROJECT_ID.appspot.com`
✅ Secure environment variables in Secret Manager
✅ Automated deployments via GitHub Actions
✅ Master key authentication enabled

**Your backend is production-ready!** 🎉

---

*Last updated: February 2026*
*For: Saree Shop Backend Express.js API*
