# Environment Variables Checklist for GCP Deployment

## 📋 Quick Checklist

Use this checklist to gather all environment variables before deployment.

---

## ✅ Required Variables (Must Have)

### 1. MASTER_API_KEY ⚠️ NEW REQUIREMENT
- **Status**: ☐ Not Set | ☐ Set
- **Where to get**: Generate with command below
- **Command**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Your value**: `_________________________________`
- **Notes**: Required for ALL API calls. Add to frontend as `NEXT_PUBLIC_MASTER_API_KEY`

### 2. DATABASE_URL
- **Status**: ☐ Not Set | ☑ Set (from your .env)
- **Where to get**: MongoDB Atlas → Connect → Connection String
- **Current value**: `mongodb+srv://akshaychavhan676:wkVkyzJo8uxACIhF@cluster0.dl1o7fn.mongodb.net/saakie`
- **Action needed**: ✅ Already have this
- **Notes**: Make sure MongoDB Atlas allows GCP IP addresses (whitelist `0.0.0.0/0`)

### 3. CLERK_SECRET_KEY
- **Status**: ☐ Not Set | ☑ Set (from your .env)
- **Where to get**: https://dashboard.clerk.com → API Keys → Secret Key
- **Current value**: `sk_test_e3BVAaVxLANxzVaLGLe3nN7Lt8BTQXSKktiH4LogpF`
- **Action needed**: ✅ Already have this
- **Notes**: For production, use `sk_live_xxxxx` instead of `sk_test_`

### 4. CLERK_WEBHOOK_SECRET
- **Status**: ☐ Not Set | ☑ Set (from your .env)
- **Where to get**: Clerk Dashboard → Webhooks → Create Endpoint → Copy Signing Secret
- **Current value**: `whsec_HOafiPAvP567a71DFatD3V6kMvqoaK1N`
- **Webhook URL needed**: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/clerk`
- **Events to subscribe**: `user.created`, `user.updated`, `user.deleted`
- **Action needed**:
  1. ☐ Update webhook URL in Clerk Dashboard with your GCP URL
  2. ☐ Verify webhook secret is correct

### 5. FRONTEND_URL
- **Status**: ☐ Not Set | ☑ Set (from your .env)
- **Where to get**: Your frontend deployment URL
- **Current value**: `http://localhost:3000`
- **Action needed**: ☐ Update to production frontend URL
- **Example**: `https://saree-shop.vercel.app` or `https://your-domain.com`
- **Notes**: Used for CORS configuration

---

## 🔐 Optional Variables (Payment & Images)

### 6. CLOUDINARY_CLOUD_NAME
- **Status**: ☐ Not Set | ☑ Set (from your .env)
- **Where to get**: https://cloudinary.com/console → Dashboard
- **Current value**: `doilfcjxb`
- **Action needed**: ✅ Already have this

### 7. CLOUDINARY_API_KEY
- **Status**: ☐ Not Set | ☑ Set (from your .env)
- **Where to get**: Cloudinary Dashboard → API Key
- **Current value**: `755529198772159`
- **Action needed**: ✅ Already have this

### 8. CLOUDINARY_API_SECRET
- **Status**: ☐ Not Set | ☑ Set (from your .env)
- **Where to get**: Cloudinary Dashboard → API Secret (click to reveal)
- **Current value**: `B4NbJUUA-Mdo0UhNxp9A_4Ysarg`
- **Action needed**: ✅ Already have this

### 9. STRIPE_SECRET_KEY (Optional)
- **Status**: ☑ Not Set | ☐ Set
- **Where to get**: https://dashboard.stripe.com → Developers → API Keys
- **Your value**: `_________________________________`
- **Notes**: Only needed if using Stripe for payments
- **For production**: Use `sk_live_xxxxx` instead of `sk_test_xxxxx`

### 10. STRIPE_WEBHOOK_SECRET (Optional)
- **Status**: ☑ Not Set | ☐ Set
- **Where to get**: Stripe → Developers → Webhooks → Add Endpoint
- **Webhook URL**: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/stripe`
- **Events**: `payment_intent.succeeded`, `payment_intent.payment_failed`
- **Your value**: `_________________________________`

### 11. RAZORPAY_KEY_ID (Optional)
- **Status**: ☑ Not Set | ☐ Set
- **Where to get**: https://dashboard.razorpay.com → Settings → API Keys
- **Your value**: `_________________________________`
- **Notes**: Only needed if using Razorpay (India) for payments

### 12. RAZORPAY_KEY_SECRET (Optional)
- **Status**: ☑ Not Set | ☐ Set
- **Where to get**: Razorpay → Settings → API Keys → Key Secret
- **Your value**: `_________________________________`

### 13. RAZORPAY_WEBHOOK_SECRET (Optional)
- **Status**: ☑ Not Set | ☐ Set
- **Where to get**: Razorpay → Settings → Webhooks → Create Webhook
- **Webhook URL**: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/razorpay`
- **Your value**: `_________________________________`

---

## 🚀 Deployment Variables (Auto-set in app.yaml)

### 14. PORT
- **Value**: `8080` (fixed for App Engine)
- **Action**: ✅ No action needed (set in app.yaml)

### 15. NODE_ENV
- **Value**: `production` or `staging`
- **Action**: ✅ No action needed (set in app.yaml)

### 16. BYPASS_MASTER_KEY
- **Value**: `false` (for production)
- **Action**: ✅ No action needed (set in app.yaml)

---

## 📝 Action Items Summary

### Before Deployment:

1. ☐ **Generate MASTER_API_KEY**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. ☐ **Update Clerk webhook URL** to your GCP URL
   - Go to: https://dashboard.clerk.com → Webhooks
   - Update endpoint to: `https://YOUR_PROJECT_ID.appspot.com/api/webhooks/clerk`

3. ☐ **Update FRONTEND_URL** to production frontend URL
   - Example: `https://saree-shop.vercel.app`

4. ☐ **Add MongoDB IP whitelist**
   - MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (all IPs) or specific GCP IP ranges

5. ☐ **Decide on payment gateways**
   - ☐ Stripe (international)
   - ☐ Razorpay (India)
   - Get API keys if using

6. ☐ **Create secrets in GCP Secret Manager**
   - Follow: [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md#option-a-google-secret-manager)

---

## 🔄 After Deployment:

### Frontend Updates Needed:

Update your frontend `.env.production`:

```env
# Add these to frontend
NEXT_PUBLIC_API_URL=https://YOUR_PROJECT_ID.appspot.com
NEXT_PUBLIC_MASTER_API_KEY=<your-generated-master-key>
```

### Update API Calls:

All frontend API calls must include master key:

```typescript
// Example
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
  headers: {
    'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY!,
    'Content-Type': 'application/json'
  }
})
```

---

## 📊 Verification Checklist

After deployment, verify:

1. ☐ Health check works:
   ```bash
   curl -H "X-API-Key: YOUR_MASTER_KEY" https://YOUR_PROJECT_ID.appspot.com/health
   ```

2. ☐ Products endpoint works:
   ```bash
   curl -H "X-API-Key: YOUR_MASTER_KEY" https://YOUR_PROJECT_ID.appspot.com/api/products
   ```

3. ☐ Master key is enforced (should fail without header):
   ```bash
   curl https://YOUR_PROJECT_ID.appspot.com/api/products
   # Expected: 401 Unauthorized
   ```

4. ☐ Database connection works (check logs):
   ```bash
   gcloud app logs tail -s default
   ```

5. ☐ Clerk webhook is receiving events
   - Test by creating a user in your frontend
   - Check Clerk Dashboard → Webhooks → View Events

6. ☐ CORS allows your frontend
   - Test API call from your frontend
   - Should not get CORS error

---

## 🆘 Quick Help

### Generate Master Key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### View Current Environment Variables (Local):
```bash
cat .env
```

### Test GCP Secret Manager Access:
```bash
gcloud secrets versions access latest --secret=MASTER_API_KEY
```

### View GCP Logs:
```bash
gcloud app logs tail -s default
```

---

## 📚 Related Documentation

- **Full Deployment Guide**: [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)
- **Master Key Documentation**: [docs/MASTER_API_KEY_AUTHENTICATION.md](./docs/MASTER_API_KEY_AUTHENTICATION.md)
- **Environment Variables Example**: [.env.example](./.env.example)

---

## ✅ Final Pre-Deployment Checklist

Before running `gcloud app deploy`:

- [ ] All required variables collected
- [ ] Secrets created in GCP Secret Manager (or added to app.yaml)
- [ ] MongoDB allows GCP IPs
- [ ] Clerk webhook URL updated
- [ ] app.yaml configured
- [ ] .gcloudignore created
- [ ] TypeScript builds successfully (`npm run build`)
- [ ] Prisma client generated (`npm run prisma:generate`)

**You're ready to deploy!** 🚀

```bash
gcloud app deploy app.yaml --quiet
```

---

*Created: February 2026*
*Project: Saree Shop Backend*
