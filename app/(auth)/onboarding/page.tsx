import { redirect } from "next/navigation";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", user.id)
    .single<{ organization_id: string | null; full_name: string | null }>();

  if (profile?.organization_id) {
    const { count } = await supabase
      .from("houses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id);

    if (count && count > 0) {
      redirect("/dashboard");
    }
  }

  return (
    <OnboardingWizard
      userName={profile?.full_name ?? user.email ?? "there"}
      organizationId={profile?.organization_id ?? null}
      stripeConfigured={isStripeConfigured()}
    />
  );
}
