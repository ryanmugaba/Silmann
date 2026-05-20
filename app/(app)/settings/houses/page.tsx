import { redirect } from "next/navigation";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import { HousesManager } from "@/components/settings/houses-manager";

export const metadata = { title: "Houses — Settings — Silman" };

export default async function HousesSettingsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.HOUSE_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: houses } = await supabase
    .from("houses")
    .select("id, name, address, suburb, state, postcode, max_residents")
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .order("name");

  return (
    <HousesManager
      houses={
        (houses ?? []) as {
          id: string;
          name: string;
          address: string | null;
          suburb: string | null;
          state: string | null;
          postcode: string | null;
          max_residents: number | null;
        }[]
      }
    />
  );
}
