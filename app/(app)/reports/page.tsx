import { redirect } from "next/navigation";
import { ReportsExportPanel } from "@/components/reports/reports-export-panel";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";

export const metadata = { title: "Reports — Silman" };

export default async function ReportsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.REPORT_VIEW)) {
    redirect("/dashboard");
  }

  const canExport = can(ctx, PermissionKey.REPORT_EXPORT);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          Reports & exports
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Download CSV exports for roster coverage, compliance evidence, and audit
          logs. Use these files for NDIS governance reviews and internal reporting.
        </p>
      </div>

      <ReportsExportPanel canExport={canExport} />
    </div>
  );
}
