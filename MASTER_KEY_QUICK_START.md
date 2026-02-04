# Master API Key - Quick Start Guide

## Setup (5 minutes)

### 1. Generate Master Key

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configure Backend

Add to `/home/l910009/Desktop/saree-shop-backend/.env`:

```env
MASTER_API_KEY="paste-your-generated-key-here"
BYPASS_MASTER_KEY=false
```

### 3. Configure Frontend

Add to your frontend `.env.local`:

```env
NEXT_PUBLIC_MASTER_API_KEY="same-key-as-backend"
```

### 4. Restart Backend

```bash
npm run dev
```

## Usage Examples

### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:3001/api/products', {
  headers: {
    'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY,
    'Content-Type': 'application/json'
  }
});
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY
  }
});

// Use it
const products = await api.get('/products');
```

### cURL

```bash
curl -X GET http://localhost:3001/api/products \
  -H "X-API-Key: your-master-key-here"
```

### Postman

1. Add header: `X-API-Key`
2. Value: `your-master-key-here`

## Development Mode (Optional)

To disable master key check during development:

```env
BYPASS_MASTER_KEY=true
NODE_ENV=development
```

**Warning:** Only works in development. Production always requires master key.

## Troubleshooting

### Error: "Master API key is required"
**Fix:** Add `X-API-Key` header to your request

### Error: "Invalid master API key"
**Fix:** Ensure frontend and backend use the same key

### Error: "Server configuration error"
**Fix:** Add `MASTER_API_KEY` to backend `.env` file

## Testing

```bash
# Without key (should fail)
curl http://localhost:3001/api/products

# With key (should succeed)
curl http://localhost:3001/api/products \
  -H "X-API-Key: your-master-key-here"
```

## Full Documentation

See [MASTER_API_KEY_AUTHENTICATION.md](docs/MASTER_API_KEY_AUTHENTICATION.md) for complete details.
