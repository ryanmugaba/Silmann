/**
 * Server-side checklist for billing / deploy readiness (logs in dev, no secrets).
 */

import { isEnvPlaceholder } from "@/lib/env/placeholders";

export type BillingReadiness = {
  supabase: boolean;
  stripeSecret: boolean;
  stripePrice: boolean;
  stripeWebhook: boolean;
  appUrl: boolean;
  ready: boolean;
  missing: string[];
};

export function getBillingReadiness(): BillingReadiness {
  const missing: string[] = [];

  const supabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const stripeSecret = !isEnvPlaceholder(process.env.STRIPE_SECRET_KEY);
  const stripePrice = !isEnvPlaceholder(process.env.STRIPE_PRICE_ID);
  const stripeWebhook = !isEnvPlaceholder(process.env.STRIPE_WEBHOOK_SECRET);

  const appUrl =
    Boolean(process.env.NEXT_PUBLIC_APP_URL) &&
    process.env.NEXT_PUBLIC_APP_URL !== "http://localhost:3000";

  if (!supabase) missing.push("Supabase (URL, anon key, service role)");
  if (!stripeSecret) missing.push("STRIPE_SECRET_KEY");
  if (!stripePrice) missing.push("STRIPE_PRICE_ID");
  if (!stripeWebhook) missing.push("STRIPE_WEBHOOK_SECRET (required in production)");
  if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL (set to your public Vercel URL)");

  return {
    supabase,
    stripeSecret,
    stripePrice,
    stripeWebhook,
    appUrl,
    ready: supabase && stripeSecret && stripePrice,
    missing,
  };
}
