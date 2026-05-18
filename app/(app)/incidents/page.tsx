import { redirect } from "next/navigation";
import { AlertTriangle, ClipboardCheck, MessageSquareWarning } from "lucide-react";
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
  title: "Incidents — Silman",
};

const INCIDENT_STEPS = [
  {
    title: "Record",
    description: "Capture what happened, who was involved, and immediate actions.",
    icon: MessageSquareWarning,
  },
  {
    title: "Follow up",
    description: "Assign actions, reminders, and house-level communications.",
    icon: ClipboardCheck,
  },
  {
    title: "Review",
    description: "Keep an audit-ready trail for operational and NDIS reviews.",
    icon: AlertTriangle,
  },
];

export default async function IncidentsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.INCIDENT_VIEW)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          Incidents
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Incident follow-up is visible from the dashboard so managers do not hit
          a dead end. Use Reminders and Notice Board for operational follow-up
          while the dedicated incident register is connected.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {INCIDENT_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="shadow-card">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-base">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <EmptyState
            icon={AlertTriangle}
            title="No incidents requiring follow-up"
            description="When incident workflows are connected, open items and follow-up tasks will appear here. For now, create reminders or post a notice for operational follow-up."
            actionLabel="Create reminder"
            actionHref="/reminders"
          />
        </CardContent>
      </Card>
    </div>
  );
}
