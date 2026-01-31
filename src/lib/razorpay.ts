import Razorpay from 'razorpay';

/**
 * Razorpay client instance
 * Only initialized if both key_id and key_secret are provided
 */
export const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

/**
 * Check if Razorpay is enabled
 */
export const isRazorpayEnabled = !!razorpay;

/**
 * Convert INR to paise (smallest currency unit)
 * Razorpay requires amounts in smallest currency unit
 * @param amount Amount in INR
 * @returns Amount in paise
 */
export const formatAmountForRazorpay = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Convert paise back to INR
 * @param amount Amount in paise
 * @returns Amount in INR
 */
export const formatAmountFromRazorpay = (amount: number): number => {
  return amount / 100;
};
