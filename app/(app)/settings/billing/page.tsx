import { Suspense } from "react";
import { BillingClient } from "@/components/settings/billing-client";
import { BillingEnvHint } from "@/components/settings/billing-env-hint";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SILMAN_PRICING_TAGLINE } from "@/lib/billing/constants";
import { isStripeConfigured } from "@/lib/billing/stripe";
import type { SubscriptionStatus } from "@/types/database";

export default async function BillingSettingsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.BILLING_MANAGE)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select(
      "name, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end"
    )
    .eq("id", ctx.organization_id)
    .single<{
      name: string;
      subscription_status: SubscriptionStatus;
      subscription_current_period_end: string | null;
      subscription_cancel_at_period_end: boolean;
    }>();

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {SILMAN_PRICING_TAGLINE} — manage your subscription and invoices through Stripe.
      </p>
      <BillingEnvHint />
      <Suspense fallback={null}>
        <BillingClient
          status={org?.subscription_status ?? "incomplete"}
          currentPeriodEnd={org?.subscription_current_period_end ?? null}
          cancelAtPeriodEnd={org?.subscription_cancel_at_period_end ?? false}
          stripeConfigured={isStripeConfigured()}
          organizationName={org?.name ?? "Your organisation"}
        />
      </Suspense>
    </div>
  );
}
