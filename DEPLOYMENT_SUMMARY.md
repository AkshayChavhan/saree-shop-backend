# 🚀 Quick Deployment Summary

## Your GCP URLs (After Deployment)

| Environment | URL |
|-------------|-----|
| **Production** | `https://YOUR_PROJECT_ID.appspot.com` |
| **Staging** | `https://staging-dot-YOUR_PROJECT_ID.appspot.com` |
| **Health Check** | `https://YOUR_PROJECT_ID.appspot.com/health` |
| **API Base** | `https://YOUR_PROJECT_ID.appspot.com/api` |

Replace `YOUR_PROJECT_ID` with your actual GCP project ID.

---

## 📋 Environment Variables Summary

### ✅ Variables You Already Have (from .env)

1. ✅ **DATABASE_URL** - MongoDB connection string
2. ✅ **CLERK_SECRET_KEY** - Clerk authentication
3. ✅ **CLERK_WEBHOOK_SECRET** - Clerk webhooks
4. ✅ **CLOUDINARY_CLOUD_NAME** - Image uploads
5. ✅ **CLOUDINARY_API_KEY** - Cloudinary API
6. ✅ **CLOUDINARY_API_SECRET** - Cloudinary secret
7. ✅ **FRONTEND_URL** - Currently `http://localhost:3000`
8. ✅ **MASTER_API_KEY** - Already generated: `6c9f64aabd5bb80cca352ce4a7eab38a6759e104e698a6c057b31f80a76602c8`

### 🔧 Variables to Update/Add

#### 1. FRONTEND_URL
- **Current**: `http://localhost:3000`
- **Update to**: Your production frontend URL
- **Example**: `https://saree-shop.vercel.app` or `https://your-domain.com`

#### 2. Update Clerk Webhook URL
- **Current webhook**: Points to localhost
- **Update to**: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/clerk`
- **Where**: Clerk Dashboard → Webhooks → Update Endpoint

#### 3. MongoDB IP Whitelist
- **Action**: Add GCP to allowed IPs
- **Where**: MongoDB Atlas → Network Access
- **IP to add**: `0.0.0.0/0` (all IPs) or specific GCP ranges

### 🎯 Optional (If Using Payments)

- **STRIPE_SECRET_KEY** - Not set (add if using Stripe)
- **STRIPE_WEBHOOK_SECRET** - Not set
- **RAZORPAY_KEY_ID** - Not set (add if using Razorpay)
- **RAZORPAY_KEY_SECRET** - Not set
- **RAZORPAY_WEBHOOK_SECRET** - Not set

---

## 🎯 Quick Deployment Steps

### Option 1: Using Google Secret Manager (Recommended)

```bash
# 1. Create secrets in GCP
# Go to: https://console.cloud.google.com/security/secret-manager
# Click "CREATE SECRET" for each variable

# 2. Deploy
npm run build
npm run prisma:generate
gcloud app deploy app.yaml --quiet
```

### Option 2: Quick Deploy (Variables in app.yaml)

1. Edit `app.yaml`:
```yaml
env_variables:
  NODE_ENV: production
  PORT: 8080
  MASTER_API_KEY: "6c9f64aabd5bb80cca352ce4a7eab38a6759e104e698a6c057b31f80a76602c8"
  DATABASE_URL: "mongodb+srv://akshaychavhan676:wkVkyzJo8uxACIhF@cluster0.dl1o7fn.mongodb.net/saakie?retryWrites=true&w=majority"
  CLERK_SECRET_KEY: "sk_test_e3BVAaVxLANxzVaLGLe3nN7Lt8BTQXSKktiH4LogpF"
  CLERK_WEBHOOK_SECRET: "whsec_HOafiPAvP567a71DFatD3V6kMvqoaK1N"
  FRONTEND_URL: "https://your-frontend-url.com"  # UPDATE THIS
  CLOUDINARY_CLOUD_NAME: "doilfcjxb"
  CLOUDINARY_API_KEY: "755529198772159"
  CLOUDINARY_API_SECRET: "B4NbJUUA-Mdo0UhNxp9A_4Ysarg"
```

2. Deploy:
```bash
npm run build
npm run prisma:generate
gcloud app deploy app.yaml --quiet
```

⚠️ **Warning**: Option 2 exposes secrets in code. Use only for testing!

---

## 📱 Frontend Integration

After deployment, update your **frontend** environment variables:

```env
# Frontend .env.production
NEXT_PUBLIC_API_URL=https://YOUR_PROJECT_ID.appspot.com
NEXT_PUBLIC_MASTER_API_KEY=6c9f64aabd5bb80cca352ce4a7eab38a6759e104e698a6c057b31f80a76602c8
```

Update API calls to include master key:

```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
  headers: {
    'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY!,
    'Content-Type': 'application/json'
  }
});
```

---

## ✅ Post-Deployment Verification

### Test 1: Health Check
```bash
curl -H "X-API-Key: 6c9f64aabd5bb80cca352ce4a7eab38a6759e104e698a6c057b31f80a76602c8" \
  https://YOUR_PROJECT_ID.appspot.com/health
```

**Expected**: `{"status":"ok","timestamp":"...","environment":"production"}`

### Test 2: Products API
```bash
curl -H "X-API-Key: 6c9f64aabd5bb80cca352ce4a7eab38a6759e104e698a6c057b31f80a76602c8" \
  https://YOUR_PROJECT_ID.appspot.com/api/products
```

**Expected**: JSON array of products

### Test 3: Master Key Enforcement
```bash
curl https://YOUR_PROJECT_ID.appspot.com/api/products
```

**Expected**: `401 Unauthorized` (no master key provided)

### Test 4: View Logs
```bash
gcloud app logs tail -s default
```

---

## 📚 Documentation Files Created

1. **[GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)** - Complete deployment guide
2. **[ENV_VARIABLES_CHECKLIST.md](./ENV_VARIABLES_CHECKLIST.md)** - Environment variables reference
3. **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** - This file
4. **[.env.example](./.env.example)** - Environment template

---

## 🆘 Common Issues

### Issue: "gcloud: command not found"
**Solution**: Install Google Cloud CLI
```bash
# Mac
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
```

### Issue: "Permission denied"
**Solution**: Authenticate
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Issue: "API not enabled"
**Solution**: Enable required APIs
```bash
gcloud services enable appengine.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Issue: Database connection fails
**Solution**:
1. Check MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0`
3. Verify DATABASE_URL is correct

---

## 📞 Need Help?

- **Full Guide**: [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)
- **Env Checklist**: [ENV_VARIABLES_CHECKLIST.md](./ENV_VARIABLES_CHECKLIST.md)
- **Master Key Docs**: [docs/MASTER_API_KEY_AUTHENTICATION.md](./docs/MASTER_API_KEY_AUTHENTICATION.md)
- **GCP Console**: https://console.cloud.google.com/appengine

---

**You have everything you need to deploy!** 🎉

Just run:
```bash
gcloud app deploy app.yaml --quiet
```

Then your backend will be live at:
```
https://YOUR_PROJECT_ID.appspot.com
```
