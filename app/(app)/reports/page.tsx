import { redirect } from "next/navigation";
import { BarChart3, Download, FileText, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Reports — Silman",
};

const REPORT_AREAS = [
  {
    title: "Roster coverage",
    description: "Review filled, unfilled, cancelled, and swap-pending shifts.",
    icon: BarChart3,
  },
  {
    title: "Compliance evidence",
    description: "Track expiring worker documents and participant plan dates.",
    icon: ShieldCheck,
  },
  {
    title: "Audit exports",
    description: "Prepare audit-ready records for NDIS governance reviews.",
    icon: FileText,
  },
];

export default async function ReportsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.REPORT_VIEW)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          Reports
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Reporting views collect operational evidence from roster, compliance,
          reminders, and audit logs. Use the module cards below as the reporting
          foundation while export workflows are connected.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {REPORT_AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <Card key={area.title} className="shadow-card">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-base">{area.title}</CardTitle>
                <CardDescription>{area.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <EmptyState
            icon={Download}
            title="Exports are not configured yet"
            description="Core report pages now resolve correctly. Export buttons will appear here once report templates and storage destinations are configured."
            actionLabel="Open audit log"
            actionHref="/settings/audit-log"
          />
        </CardContent>
      </Card>
    </div>
  );
}
