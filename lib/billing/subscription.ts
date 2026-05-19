import { createServiceClient } from "@/lib/supabase/server";
import type { OrganizationRow } from "@/types/database";

export type SubscriptionStatus = OrganizationRow["subscription_status"];

export type OrgSubscription = {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
};

export { isSubscriptionActive } from "@/lib/billing/constants";

export async function getOrgSubscription(
  organizationId: string
): Promise<OrgSubscription | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "subscription_status, subscription_current_period_end, subscription_cancel_at_period_end, stripe_customer_id"
    )
    .eq("id", organizationId)
    .is("deleted_at", null)
    .single<{
      subscription_status: SubscriptionStatus;
      subscription_current_period_end: string | null;
      subscription_cancel_at_period_end: boolean;
      stripe_customer_id: string | null;
    }>();

  if (error || !data) return null;

  return {
    status: data.subscription_status,
    currentPeriodEnd: data.subscription_current_period_end,
    cancelAtPeriodEnd: data.subscription_cancel_at_period_end,
    stripeCustomerId: data.stripe_customer_id,
  };
}

export async function updateOrgSubscription(
  organizationId: string,
  patch: Partial<{
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: SubscriptionStatus;
    subscription_current_period_end: string | null;
    subscription_cancel_at_period_end: boolean;
  }>
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", organizationId);

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}
