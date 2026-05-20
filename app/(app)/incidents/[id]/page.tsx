import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { IncidentDetailClient } from "@/components/incidents/incident-detail-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  type IncidentDetail,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
} from "@/types/incidents";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.INCIDENT_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("incidents")
    .select(
      `
      *,
      houses ( name ),
      participants ( full_name, preferred_name ),
      reporter:profiles!incidents_reported_by_fkey ( full_name )
    `
    )
    .eq("id", id)
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .single();

  if (!row) notFound();

  const r = row as {
    id: string;
    title: string;
    description: string;
    incident_type: string;
    severity: string;
    status: string;
    occurred_at: string;
    immediate_actions: string | null;
    follow_up_notes: string | null;
    house_id: string | null;
    participant_id: string | null;
    closed_at: string | null;
    created_at: string;
    houses: { name: string } | null;
    participants: { full_name: string; preferred_name: string | null } | null;
    reporter: { full_name: string | null } | null;
  };

  const incident: IncidentDetail = {
    id: r.id,
    title: r.title,
    description: r.description,
    incident_type: r.incident_type as IncidentType,
    severity: r.severity as IncidentSeverity,
    status: r.status as IncidentStatus,
    occurred_at: r.occurred_at,
    immediate_actions: r.immediate_actions,
    follow_up_notes: r.follow_up_notes,
    house_id: r.house_id,
    participant_id: r.participant_id,
    house_name: r.houses?.name ?? null,
    participant_name:
      r.participants?.preferred_name ?? r.participants?.full_name ?? null,
    reporter_name: r.reporter?.full_name ?? "Unknown",
    closed_at: r.closed_at,
    created_at: r.created_at,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 rounded-xl">
        <Link href="/incidents">
          <ChevronLeft className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Incidents
        </Link>
      </Button>

      <Card className="shadow-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{INCIDENT_TYPE_LABELS[incident.incident_type]}</Badge>
            <Badge variant="outline">
              {INCIDENT_SEVERITY_LABELS[incident.severity]}
            </Badge>
            <Badge variant="secondary">
              {INCIDENT_STATUS_LABELS[incident.status]}
            </Badge>
          </div>
          <CardTitle className="font-display text-2xl tracking-heading">
            {incident.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(incident.occurred_at), "d MMMM yyyy, h:mm a")}
            {incident.house_name ? ` · ${incident.house_name}` : ""}
            {incident.participant_name
              ? ` · ${incident.participant_name}`
              : ""}
            <br />
            Reported by {incident.reporter_name}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-foreground">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {incident.description}
            </p>
          </div>
          {incident.immediate_actions ? (
            <div>
              <p className="font-medium text-foreground">Immediate actions</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {incident.immediate_actions}
              </p>
            </div>
          ) : null}
          {incident.follow_up_notes ? (
            <div>
              <p className="font-medium text-foreground">Follow-up notes</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {incident.follow_up_notes}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <IncidentDetailClient
        incident={incident}
        canEdit={can(ctx, PermissionKey.INCIDENT_EDIT)}
        canClose={can(ctx, PermissionKey.INCIDENT_CLOSE)}
      />
    </div>
  );
}
