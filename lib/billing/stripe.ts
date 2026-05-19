import Stripe from "stripe";
import { isEnvPlaceholder } from "@/lib/env/placeholders";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || isEnvPlaceholder(key)) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripe() && !isEnvPlaceholder(process.env.STRIPE_PRICE_ID));
}
