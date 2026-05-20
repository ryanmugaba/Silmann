import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSubscriptionActive } from "@/lib/billing/constants";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { getOrgSubscription } from "@/lib/billing/subscription";
import { AppShell, type AppShellUser } from "@/components/shared/app-shell";
import type { Density } from "@/components/providers/density-provider";
import { PermissionProvider } from "@/components/shared/permission-provider";
import type { HouseOption } from "@/components/shared/house-context";
import { getPermissionContext } from "@/lib/primitives/rbac";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name, email, avatar_url, notification_preferences")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single<{
      organization_id: string | null;
      full_name: string | null;
      email: string;
      avatar_url: string | null;
      notification_preferences: Record<string, unknown> | null;
    }>();

  if (!profile?.organization_id) {
    redirect("/onboarding");
  }

  let permissionContext;
  try {
    permissionContext = await getPermissionContext();
  } catch {
    redirect("/onboarding");
  }

  if (isStripeConfigured()) {
    const pathname = headers().get("x-pathname") ?? "";
    const billingExempt =
      pathname.startsWith("/settings/billing") ||
      pathname === "/subscription-required";

    if (!billingExempt) {
      const subscription = await getOrgSubscription(profile.organization_id);
      if (!isSubscriptionActive(subscription?.status)) {
        if (permissionContext.role === "owner") {
          redirect("/settings/billing");
        }
        redirect("/subscription-required");
      }
    }
  }

  const { data: houseRows } = await supabase
    .from("houses")
    .select("id, name")
    .eq("organization_id", profile.organization_id)
    .is("deleted_at", null)
    .order("name")
    .returns<{ id: string; name: string }[]>();

  const assignedIds = new Set(permissionContext.house_ids);
  const houses: HouseOption[] = (houseRows ?? []).filter(
    (h) => assignedIds.size === 0 || assignedIds.has(h.id)
  );

  const prefs = profile.notification_preferences ?? {};
  const densityRaw = prefs.density;
  const density: Density =
    densityRaw === "compact" ||
    densityRaw === "comfortable" ||
    densityRaw === "spacious"
      ? densityRaw
      : "comfortable";

  const shellUser: AppShellUser = {
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
  };

  const { data: notificationRows } = await supabase
    .from("notifications")
    .select("id, type, title, body, created_at, read_at, action_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <PermissionProvider value={permissionContext}>
      <AppShell
        user={shellUser}
        houses={houses}
        notifications={notificationRows ?? []}
        density={density}
      >
        {children}
      </AppShell>
    </PermissionProvider>
  );
}
