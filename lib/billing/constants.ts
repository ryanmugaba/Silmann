/** Display price shown on marketing and billing pages (AUD). */
export const SILMAN_MONTHLY_PRICE = "$29.99";

/** Amount in cents for Stripe (AUD $29.99). */
export const SILMAN_MONTHLY_AMOUNT_CENTS = 2999;

export const SILMAN_CURRENCY = "aud";

export const SILMAN_PLAN_NAME = "Silman Pro";

/** Free trial length (days) before the first charge. */
export const SILMAN_TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? "14") || 14;

export const SILMAN_TRIAL_LABEL = `${SILMAN_TRIAL_DAYS}-day free trial`;

/** Short line for marketing / billing CTAs. */
export const SILMAN_PRICING_TAGLINE = `${SILMAN_TRIAL_LABEL}, then ${SILMAN_MONTHLY_PRICE}/month`;

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
]);

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_SUBSCRIPTION_STATUSES.has(status));
}
