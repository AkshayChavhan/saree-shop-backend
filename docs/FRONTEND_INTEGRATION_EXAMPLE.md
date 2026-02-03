# Frontend Integration Example

This guide shows how to integrate the Master API Key authentication into your frontend application.

## Next.js + React Example

### 1. Environment Configuration

Create or update `.env.local`:

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MASTER_API_KEY=your-master-api-key-here

# Clerk Authentication (existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 2. Create API Client

Create `lib/api-client.ts`:

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuth } from '@clerk/nextjs';

/**
 * Base API client with master key authentication
 */
export const createApiClient = (clerkToken?: string): AxiosInstance => {
  const config: AxiosRequestConfig = {
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY,
    },
  };

  // Add Clerk token if provided
  if (clerkToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${clerkToken}`,
    };
  }

  const client = axios.create(config);

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.data?.error) {
        const { message, code } = error.response.data.error;
        console.error(`API Error [${code}]:`, message);

        // Handle master key errors
        if (code === 'MASTER_KEY_MISSING' || code === 'MASTER_KEY_INVALID') {
          console.error('Master API key error. Check your environment configuration.');
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * React hook for authenticated API calls
 */
export const useApiClient = () => {
  const { getToken } = useAuth();

  const getClient = async () => {
    const token = await getToken();
    return createApiClient(token || undefined);
  };

  return { getClient };
};
```

### 3. Use in Components

#### Public Endpoints (No User Auth)

```typescript
// pages/products/index.tsx
import { useEffect, useState } from 'react';
import { createApiClient } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  price: number;
  // ... other fields
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Only master key needed (public endpoint)
        const api = createApiClient();
        const response = await api.get('/api/products');

        if (response.data.success) {
          setProducts(response.data.data.products);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

#### Protected Endpoints (User Auth Required)

```typescript
// components/Cart.tsx
import { useEffect, useState } from 'react';
import { useApiClient } from '@/lib/api-client';
import { useAuth } from '@clerk/nextjs';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

export default function Cart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { isSignedIn } = useAuth();
  const { getClient } = useApiClient();

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchCart = async () => {
      try {
        // Master key + user auth
        const api = await getClient();
        const response = await api.get('/api/cart');

        if (response.data.success) {
          setCart(response.data.items);
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      }
    };

    fetchCart();
  }, [isSignedIn]);

  const addToCart = async (productId: string, quantity: number) => {
    try {
      const api = await getClient();
      const response = await api.post('/api/cart', {
        productId,
        quantity
      });

      if (response.data.success) {
        setCart(response.data.items);
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  return (
    <div>
      {/* Cart UI */}
    </div>
  );
}
```

### 4. Server-Side API Calls (Next.js App Router)

```typescript
// app/api/proxy/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Get Clerk auth if needed
    const { userId } = await auth();

    // Call backend with master key
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_MASTER_API_KEY!,
        'Content-Type': 'application/json',
        ...(userId && { 'Authorization': `Bearer ${await getToken()}` })
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch products' } },
      { status: 500 }
    );
  }
}
```

### 5. Custom React Query Hook

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';
import { useAuth } from '@clerk/nextjs';

export const useProducts = () => {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const api = createApiClient();
      const response = await api.get('/api/products');
      return response.data.data.products;
    }
  });
};

export const useCart = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const token = await getToken();
      const api = createApiClient(token || undefined);
      const response = await api.get('/api/cart');
      return response.data;
    },
    enabled: !!getToken
  });

  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const token = await getToken();
      const api = createApiClient(token || undefined);
      const response = await api.post('/api/cart', { productId, quantity });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  return { cart, isLoading, addToCart };
};
```

## React Native Example

```typescript
// services/api.ts
import axios from 'axios';
import { getToken } from './auth'; // Your auth service

const API_URL = 'http://localhost:3001';
const MASTER_API_KEY = 'your-master-api-key-here';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': MASTER_API_KEY,
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usage
export const getProducts = async () => {
  const response = await api.get('/api/products');
  return response.data;
};

export const addToCart = async (productId: string, quantity: number) => {
  const response = await api.post('/api/cart', { productId, quantity });
  return response.data;
};
```

## Vanilla JavaScript Example

```javascript
// api.js
const API_URL = 'http://localhost:3001';
const MASTER_API_KEY = 'your-master-api-key-here';

async function fetchProducts() {
  const response = await fetch(`${API_URL}/api/products`, {
    headers: {
      'X-API-Key': MASTER_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data.products;
}

async function addToCart(productId, quantity, userToken) {
  const response = await fetch(`${API_URL}/api/cart`, {
    method: 'POST',
    headers: {
      'X-API-Key': MASTER_API_KEY,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ productId, quantity })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data;
}
```

## Error Handling

```typescript
// utils/api-error-handler.ts
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code: string;
}

export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error: ApiError }>;

    if (axiosError.response?.data?.error) {
      const { message, code } = axiosError.response.data.error;

      // Handle specific master key errors
      if (code === 'MASTER_KEY_MISSING') {
        return {
          message: 'Application configuration error. Please contact support.',
          code
        };
      }

      if (code === 'MASTER_KEY_INVALID') {
        return {
          message: 'Authentication failed. Please refresh and try again.',
          code
        };
      }

      return { message, code };
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  };
};

// Usage in components
try {
  const response = await api.get('/api/products');
} catch (error) {
  const apiError = handleApiError(error);
  toast.error(apiError.message);
}
```

## Environment-Specific Configuration

```typescript
// config/api.ts
const getApiConfig = () => {
  const env = process.env.NODE_ENV;

  switch (env) {
    case 'development':
      return {
        apiUrl: 'http://localhost:3001',
        masterApiKey: process.env.NEXT_PUBLIC_MASTER_API_KEY_DEV
      };

    case 'staging':
      return {
        apiUrl: 'https://staging-api.saree-shop.com',
        masterApiKey: process.env.NEXT_PUBLIC_MASTER_API_KEY_STAGING
      };

    case 'production':
      return {
        apiUrl: 'https://api.saree-shop.com',
        masterApiKey: process.env.NEXT_PUBLIC_MASTER_API_KEY_PROD
      };

    default:
      return {
        apiUrl: 'http://localhost:3001',
        masterApiKey: process.env.NEXT_PUBLIC_MASTER_API_KEY
      };
  }
};

export const { apiUrl, masterApiKey } = getApiConfig();
```

## Testing

```typescript
// __tests__/api-client.test.ts
import { createApiClient } from '@/lib/api-client';
import MockAdapter from 'axios-mock-adapter';

describe('API Client', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    const client = createApiClient();
    mock = new MockAdapter(client);
  });

  it('should include master API key in headers', async () => {
    mock.onGet('/api/products').reply((config) => {
      expect(config.headers?.['X-API-Key']).toBe(
        process.env.NEXT_PUBLIC_MASTER_API_KEY
      );
      return [200, { success: true, data: [] }];
    });

    const client = createApiClient();
    await client.get('/api/products');
  });

  it('should handle master key errors', async () => {
    mock.onGet('/api/products').reply(401, {
      success: false,
      error: {
        message: 'Master API key is required',
        code: 'MASTER_KEY_MISSING'
      }
    });

    const client = createApiClient();

    await expect(client.get('/api/products')).rejects.toThrow();
  });
});
```

## Best Practices

1. **Never hardcode the master key** - Always use environment variables
2. **Store master key in `.env.local`** - Don't commit to version control
3. **Use different keys per environment** - Dev, staging, production
4. **Implement proper error handling** - Show user-friendly messages
5. **Use interceptors for global configuration** - DRY principle
6. **Cache API client instances** - Avoid creating multiple instances
7. **Implement retry logic** - For transient failures
8. **Log errors appropriately** - For debugging without exposing keys

## Security Considerations

- Never expose master key in client-side console logs
- Use HTTPS in production to encrypt header transmission
- Implement rate limiting on frontend to prevent abuse
- Store keys securely in environment variables only
- Rotate keys regularly following documented process
- Monitor for unauthorized access attempts

## Summary

The Master API Key system provides infrastructure-level security. Your frontend must:

1. Include `X-API-Key` header in **all** backend API requests
2. Store master key securely in environment variables
3. Combine with Clerk authentication for protected endpoints
4. Handle master key errors gracefully
5. Use different keys for different environments

For complete backend documentation, see [MASTER_API_KEY_AUTHENTICATION.md](MASTER_API_KEY_AUTHENTICATION.md).
