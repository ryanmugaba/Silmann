import { NextResponse } from "next/server";
import { SILMAN_TRIAL_DAYS } from "@/lib/billing/constants";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { can } from "@/lib/primitives/rbac/check";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID." },
      { status: 503 }
    );
  }

  const stripe = getStripe()!;
  const ctx = await getPermissionContext();

  if (!can(ctx, PermissionKey.BILLING_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("id", ctx.organization_id)
    .single<{
      id: string;
      name: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      subscription_status: string;
    }>();

  if (!org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  const base = appUrl();
  const priceId = process.env.STRIPE_PRICE_ID!;

  const eligibleForTrial =
    org.subscription_status === "incomplete" && !org.stripe_subscription_id;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: org.id,
    metadata: { organization_id: org.id },
    subscription_data: {
      metadata: { organization_id: org.id },
      ...(eligibleForTrial ? { trial_period_days: SILMAN_TRIAL_DAYS } : {}),
    },
    success_url: `${base}/settings/billing?checkout=success`,
    cancel_url: `${base}/settings/billing?checkout=canceled`,
    allow_promotion_codes: true,
    ...(org.stripe_customer_id
      ? { customer: org.stripe_customer_id }
      : { customer_email: user.email }),
  });

  return NextResponse.json({ url: session.url });
}
