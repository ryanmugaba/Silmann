import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { KeyRound } from "lucide-react";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";

export const metadata = { title: "Custom roles — Settings — Silman" };

export default async function CustomRolesSettingsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.CUSTOM_ROLE_MANAGE)) {
    redirect("/dashboard");
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading">
          Custom roles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={KeyRound}
          title="Custom roles coming soon"
          description="Create named roles with tailored permission sets. Owners can configure this in a future release."
        />
      </CardContent>
    </Card>
  );
}
