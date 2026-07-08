import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise() {
  if (!stripePromise) {
    const publishableKey = (
      (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
      (globalThis as any).__VITE_STRIPE_PUBLISHABLE_KEY ||
      ""
    ).trim();

    if (!publishableKey) {
      console.warn('Stripe publishable key is missing. Set VITE_STRIPE_PUBLISHABLE_KEY in your frontend env.');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
