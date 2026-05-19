import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("your-stripe")) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    getStripe() &&
      process.env.STRIPE_PRICE_ID &&
      !process.env.STRIPE_PRICE_ID.includes("price_xxx")
  );
}
