import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/components/settings/users-table";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Users — Settings — Silman" };

export default async function UsersSettingsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.USER_INVITE)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .order("full_name");

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading">Users</CardTitle>
      </CardHeader>
      <CardContent>
        <UsersTable
          users={(users ?? []) as {
            id: string;
            email: string;
            full_name: string | null;
            role: string;
            is_active: boolean;
          }[]}
        />
      </CardContent>
    </Card>
  );
}
