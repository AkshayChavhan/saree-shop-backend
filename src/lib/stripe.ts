import Stripe from 'stripe';

/**
 * Stripe client instance
 * Only initialized if STRIPE_SECRET_KEY is provided
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null;

/**
 * Check if Stripe is enabled
 */
export const isStripeEnabled = !!stripe;

/**
 * Convert INR to paise (smallest currency unit)
 * Stripe requires amounts in smallest currency unit
 * @param amount Amount in INR
 * @returns Amount in paise
 */
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Convert paise back to INR
 * @param amount Amount in paise
 * @returns Amount in INR
 */
export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100;
};
