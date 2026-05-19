import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.BILLING_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", ctx.organization_id)
    .single<{ stripe_customer_id: string | null }>();

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet. Subscribe first." },
      { status: 400 }
    );
  }

  const stripe = getStripe()!;
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${appUrl()}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
