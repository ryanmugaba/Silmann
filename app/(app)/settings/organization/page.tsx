import { redirect } from "next/navigation";
import { OrganizationForm } from "@/components/settings/organization-form";
import { PublicHolidaysList } from "@/components/settings/public-holidays-list";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Organisation — Settings — Silman" };

export default async function OrganizationSettingsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.ORG_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: org }, { data: holidays }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, abn, ndis_registration_number, timezone, settings")
      .eq("id", ctx.organization_id)
      .single<{
        name: string;
        abn: string | null;
        ndis_registration_number: string | null;
        timezone: string;
        settings: Record<string, unknown> | null;
      }>(),
    supabase
      .from("public_holidays")
      .select("id, date, name, state")
      .eq("organization_id", ctx.organization_id)
      .order("date", { ascending: true })
      .limit(50),
  ]);

  const settings = org?.settings ?? {};
  const brandColor =
    typeof settings.brand_color === "string"
      ? settings.brand_color
      : "#2563eb";

  return (
    <div className="space-y-6">
      <OrganizationForm
        initial={{
          name: org?.name ?? "",
          abn: org?.abn ?? "",
          ndisRegistrationNumber: org?.ndis_registration_number ?? "",
          timezone: org?.timezone ?? "Australia/Sydney",
          brandColor,
        }}
      />
      <PublicHolidaysList
        holidays={(holidays ?? []) as {
          id: string;
          date: string;
          name: string;
          state: string | null;
        }[]}
      />
    </div>
  );
}
