// Re-export all types
export * from './express';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Product types
export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  rating: number;
  reviewCount: number;
  image: string | null;
  colors: string[];
  category: string | null;
  stock: number;
  isNew: boolean;
  isBestseller: boolean;
  inStock: boolean;
}

// Cart types
export interface CartItem {
  id: string;
  productId: string;
  product: {
    name: string;
    slug: string;
    price: number;
    image: string | null;
    stock: number;
  };
  quantity: number;
  color: { name: string; hexCode: string } | null;
  size: { name: string } | null;
  itemTotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

// Order types
export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  createdAt: Date;
}

// User types
export interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

// Admin Dashboard types
export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  newUsersThisMonth: number;
}
