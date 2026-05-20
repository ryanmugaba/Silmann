import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionsMatrix } from "@/components/settings/permissions-matrix";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Permissions — Settings — Silman" };

export default async function PermissionsSettingsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.SETTINGS_EDIT)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: grants } = await supabase
    .from("permissions")
    .select("role_name, permission_key, granted")
    .eq("organization_id", ctx.organization_id);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading">
          Permission matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PermissionsMatrix
          grants={
            (grants ?? []) as {
              role_name: string;
              permission_key: string;
              granted: boolean;
            }[]
          }
        />
      </CardContent>
    </Card>
  );
}
