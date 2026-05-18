import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AuditLogTable,
  type AuditLogRow,
} from "@/components/settings/audit-log-table";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log — Settings — Silman" };

export default async function AuditLogSettingsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.SETTINGS_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_log")
    .select(
      "id, action, entity_type, entity_id, user_id, created_at, profiles:user_id ( full_name )"
    )
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows: AuditLogRow[] = (logs ?? []).map((row) => {
    const log = row as {
      id: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      created_at: string;
      profiles: { full_name: string | null } | null;
    };
    return {
      id: log.id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      created_at: log.created_at,
      user_name: log.profiles?.full_name ?? "System",
    };
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading">Audit log</CardTitle>
      </CardHeader>
      <CardContent>
        <AuditLogTable logs={rows} />
      </CardContent>
    </Card>
  );
}
