# Master API Key Authentication System

## Overview

The Master API Key authentication system provides an additional security layer for all backend API requests. This key must be included in request headers **before** any other authentication (Clerk tokens, admin roles, etc.).

## Architecture

```
Client Request
    ↓
[Master Key Middleware] ← First security check
    ↓
[User Auth Middleware] ← Clerk JWT verification
    ↓
[Admin Role Middleware] ← Role-based access control
    ↓
[Route Handler] ← Business logic
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Master API Key - REQUIRED for all API requests
MASTER_API_KEY="your-secure-master-api-key-here-change-in-production"

# Bypass master key in development (optional, NOT for production)
BYPASS_MASTER_KEY=false
```

### Generating a Secure Master Key

Use a strong, randomly generated key:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Using uuidgen (macOS/Linux)
uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]'
```

**Example output:**
```
a7f3b8c2d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5
```

## Usage

### Client-Side Implementation

All API requests must include the master API key in the request headers:

**Header Name:** `X-API-Key` or `x-api-key` (case-insensitive)

#### JavaScript/TypeScript Example

```typescript
// Using fetch
const response = await fetch('http://localhost:3001/api/products', {
  method: 'GET',
  headers: {
    'X-API-Key': process.env.MASTER_API_KEY,
    'Content-Type': 'application/json',
    // User authentication token (if needed)
    'Authorization': `Bearer ${clerkToken}`
  }
});

// Using axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'X-API-Key': process.env.MASTER_API_KEY
  }
});

// Add Clerk token dynamically
api.interceptors.request.use((config) => {
  const token = getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### cURL Example

```bash
curl -X GET http://localhost:3001/api/products \
  -H "X-API-Key: your-master-api-key-here" \
  -H "Content-Type: application/json"
```

#### Postman Example

1. Open Postman
2. Create a new request
3. Go to "Headers" tab
4. Add header:
   - Key: `X-API-Key`
   - Value: `your-master-api-key-here`
5. Send request

### Protected Endpoints Example

```typescript
// User needs BOTH master key AND Clerk authentication
const response = await fetch('http://localhost:3001/api/cart', {
  headers: {
    'X-API-Key': masterApiKey,        // Master key (required)
    'Authorization': `Bearer ${token}` // User token (required)
  }
});

// Admin needs master key AND admin authentication
const response = await fetch('http://localhost:3001/api/admin/dashboard', {
  headers: {
    'X-API-Key': masterApiKey,        // Master key (required)
    'Authorization': `Bearer ${adminToken}` // Admin token (required)
  }
});
```

## Middleware Details

### `requireMasterKey` Middleware

Applied globally to all `/api/*` routes in `src/index.ts`.

**Flow:**
1. Check if `BYPASS_MASTER_KEY=true` (development only)
2. Verify `MASTER_API_KEY` is configured
3. Extract `X-API-Key` from request headers
4. Compare provided key with configured key
5. Allow or deny request

**Error Responses:**

```typescript
// Missing master key
{
  "success": false,
  "error": {
    "message": "Master API key is required. Include X-API-Key header with your request.",
    "code": "MASTER_KEY_MISSING"
  }
}
// Status: 401

// Invalid master key
{
  "success": false,
  "error": {
    "message": "Invalid master API key. Access denied.",
    "code": "MASTER_KEY_INVALID"
  }
}
// Status: 401

// Master key not configured (server error)
{
  "success": false,
  "error": {
    "message": "Server configuration error",
    "code": "MASTER_KEY_NOT_CONFIGURED"
  }
}
// Status: 500
```

### `optionalMasterKey` Middleware

For endpoints that support both public and authenticated access.

**Usage:**
```typescript
import { optionalMasterKey } from '../middleware/masterKey.middleware';

router.get('/public-data', optionalMasterKey, async (req, res) => {
  // Endpoint logic
});
```

## Security Best Practices

### 1. Key Management

- **NEVER** commit master keys to version control
- **NEVER** expose keys in client-side code
- **ALWAYS** use environment variables
- **ROTATE** keys regularly (every 90 days recommended)
- **USE** different keys for development, staging, and production

### 2. Environment-Specific Keys

```env
# Development
MASTER_API_KEY="dev-a7f3b8c2d4e5f6a1b2c3d4e5f6a7b8c9"

# Staging
MASTER_API_KEY="stg-b8c2d4e5f6a1b2c3d4e5f6a7b8c9d0e1"

# Production
MASTER_API_KEY="prd-c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8"
```

### 3. Key Rotation Process

1. Generate new master API key
2. Update `.env` on server
3. Deploy backend with new key
4. Update frontend environment variables
5. Deploy frontend
6. Verify all services working
7. Invalidate old key

### 4. Monitoring

Log master key validation attempts (without exposing the key):

```typescript
// In middleware
console.log({
  timestamp: new Date().toISOString(),
  ip: req.ip,
  endpoint: req.path,
  masterKeyValid: true/false,
  userAgent: req.headers['user-agent']
});
```

## Development Mode

### Bypassing Master Key Check

**ONLY for local development:**

```env
BYPASS_MASTER_KEY=true
NODE_ENV=development
```

This allows requests without the `X-API-Key` header. The middleware will log a warning:

```
⚠️  Master API key check bypassed (development mode)
```

**IMPORTANT:** This bypass **ONLY** works when:
- `BYPASS_MASTER_KEY=true` AND
- `NODE_ENV=development`

In production, the master key is **ALWAYS** required.

## Testing

### Manual Testing with cURL

```bash
# Test without master key (should fail)
curl -X GET http://localhost:3001/api/products

# Test with master key (should succeed)
curl -X GET http://localhost:3001/api/products \
  -H "X-API-Key: your-master-api-key-here"

# Test protected endpoint (needs both keys)
curl -X GET http://localhost:3001/api/cart \
  -H "X-API-Key: your-master-api-key-here" \
  -H "Authorization: Bearer clerk-token-here"
```

### Automated Testing

```typescript
import request from 'supertest';
import app from '../src/index';

describe('Master API Key Authentication', () => {
  it('should reject requests without master key', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect(401);

    expect(response.body.error.code).toBe('MASTER_KEY_MISSING');
  });

  it('should reject requests with invalid master key', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('X-API-Key', 'invalid-key')
      .expect(401);

    expect(response.body.error.code).toBe('MASTER_KEY_INVALID');
  });

  it('should accept requests with valid master key', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('X-API-Key', process.env.MASTER_API_KEY!)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## Routes Protected

The master key middleware is applied to **ALL** API routes:

### Public Routes (Master Key Only)
- `/api/products` - Product listings
- `/api/categories` - Category listings
- `/api/hero-slides` - Hero slides
- `/api/promotional-data` - Promotional data
- `/api/auth` - Authentication endpoints

### Protected Routes (Master Key + User Auth)
- `/api/cart` - Shopping cart
- `/api/orders` - Order management
- `/api/wishlist` - User wishlist
- `/api/payments` - Payment processing

### Admin Routes (Master Key + Admin Auth)
- `/api/admin/dashboard` - Admin dashboard
- `/api/admin/users` - User management
- `/api/admin/products` - Product management
- `/api/admin/orders` - Order management
- `/api/admin/categories` - Category management

### Webhook Routes (Master Key + Signature Verification)
- `/api/webhooks/clerk` - Clerk webhooks
- `/api/webhooks/stripe` - Stripe webhooks
- `/api/webhooks/razorpay` - Razorpay webhooks

## Troubleshooting

### Issue: "Master API key is required"

**Cause:** Missing `X-API-Key` header

**Solution:**
```typescript
// Add header to request
headers: {
  'X-API-Key': process.env.MASTER_API_KEY
}
```

### Issue: "Invalid master API key"

**Cause:** Incorrect key value

**Solution:**
1. Verify `.env` file has correct `MASTER_API_KEY`
2. Ensure frontend and backend use same key
3. Check for whitespace or special characters
4. Restart server after changing `.env`

### Issue: "Server configuration error"

**Cause:** `MASTER_API_KEY` not set in backend `.env`

**Solution:**
1. Add `MASTER_API_KEY` to backend `.env` file
2. Restart server
3. Verify with `echo $MASTER_API_KEY` (or check environment)

### Issue: Works in development but fails in production

**Cause:** `BYPASS_MASTER_KEY=true` in development

**Solution:**
1. Set `BYPASS_MASTER_KEY=false` in production
2. Ensure production environment has `MASTER_API_KEY` configured
3. Update production deployment with correct key

## Migration Guide

### Adding Master Key to Existing Frontend

1. **Update environment variables:**
   ```env
   # .env.local (frontend)
   NEXT_PUBLIC_MASTER_API_KEY="your-master-api-key-here"
   ```

2. **Update API client:**
   ```typescript
   // lib/api.ts
   const api = axios.create({
     baseURL: process.env.NEXT_PUBLIC_API_URL,
     headers: {
       'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY
     }
   });
   ```

3. **Update all fetch calls:**
   ```typescript
   // Before
   fetch('/api/products')

   // After
   fetch('/api/products', {
     headers: {
       'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY
     }
   })
   ```

## FAQ

**Q: Why do I need both master key and user authentication?**
A: Master key prevents unauthorized API access at the infrastructure level. User authentication identifies the specific user making the request.

**Q: Can I use different master keys for different endpoints?**
A: Not with the current implementation. Consider implementing API key scopes if needed.

**Q: Should I rotate the master key?**
A: Yes, rotate every 90 days or immediately if compromised.

**Q: What happens if master key is compromised?**
A: Generate a new key immediately, update all services, and monitor for suspicious activity.

**Q: Can I have multiple valid master keys?**
A: Not natively. Implement custom logic in middleware if needed for zero-downtime rotation.

## Summary

The Master API Key system provides:
- **Infrastructure-level security** before authentication
- **Consistent protection** across all API routes
- **Easy configuration** via environment variables
- **Development flexibility** with bypass option
- **Clear error messages** for debugging

**Remember:** Master key is infrastructure security. User authentication is identity security. Both are required for protected endpoints.
