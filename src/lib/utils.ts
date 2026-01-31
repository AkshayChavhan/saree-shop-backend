/**
 * Generate a random string
 * @param length Length of the string
 * @returns Random alphanumeric string
 */
export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a slug from a string
 * @param text Input text
 * @returns URL-safe slug
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generate unique order number
 * @returns Order number in format ORD-YYYY-XXXXXX
 */
export const generateOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}-${random}`;
};

/**
 * Format price for display
 * @param price Price in number
 * @param currency Currency code
 * @returns Formatted price string
 */
export const formatPrice = (price: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(price);
};

/**
 * Calculate discount percentage
 * @param originalPrice Original price
 * @param salePrice Sale price
 * @returns Discount percentage
 */
export const calculateDiscountPercentage = (
  originalPrice: number,
  salePrice: number
): number => {
  if (originalPrice <= 0 || salePrice <= 0) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

/**
 * Validate email format
 * @param email Email string
 * @returns Boolean indicating valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sleep utility for async operations
 * @param ms Milliseconds to sleep
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Omit keys from an object
 * @param obj Source object
 * @param keys Keys to omit
 * @returns New object without specified keys
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

/**
 * Pick keys from an object
 * @param obj Source object
 * @param keys Keys to pick
 * @returns New object with only specified keys
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};
