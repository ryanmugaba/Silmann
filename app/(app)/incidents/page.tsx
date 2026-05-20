import { redirect } from "next/navigation";
import { IncidentsList } from "@/components/incidents/incidents-list";
import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type {
  IncidentListItem,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from "@/types/incidents";

export const metadata = { title: "Incidents — Silman" };

export default async function IncidentsPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.INCIDENT_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: rows }, { data: houses }, { data: participants }] =
    await Promise.all([
      supabase
        .from("incidents")
        .select(
          `
          id, title, incident_type, severity, status, occurred_at,
          houses ( name ),
          participants ( full_name ),
          reporter:profiles!incidents_reported_by_fkey ( full_name )
        `
        )
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("houses")
        .select("id, name")
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("participants")
        .select("id, full_name, preferred_name")
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .order("full_name"),
    ]);

  type Raw = {
    id: string;
    title: string;
    incident_type: string;
    severity: string;
    status: string;
    occurred_at: string;
    houses: { name: string } | null;
    participants: { full_name: string; preferred_name: string | null } | null;
    reporter: { full_name: string | null } | null;
  };

  const incidents: IncidentListItem[] = (rows ?? []).map((raw) => {
    const r = raw as Raw;
    return {
      id: r.id,
      title: r.title,
      incident_type: r.incident_type as IncidentType,
      severity: r.severity as IncidentSeverity,
      status: r.status as IncidentStatus,
      occurred_at: r.occurred_at,
      house_name: r.houses?.name ?? null,
      participant_name:
        r.participants?.preferred_name ?? r.participants?.full_name ?? null,
      reporter_name: r.reporter?.full_name ?? "Unknown",
    };
  });

  const openCount = incidents.filter((i) => i.status !== "closed").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-heading">
            Incident register
          </h1>
          <p className="text-muted-foreground">
            {openCount > 0
              ? `${openCount} open or in-progress incident${openCount === 1 ? "" : "s"}`
              : "NDIS-ready incident log for your organisation"}
          </p>
        </div>
        {can(ctx, PermissionKey.INCIDENT_CREATE) ? (
          <CreateIncidentDialog
            houses={(houses ?? []).map((h) => ({ id: h.id, name: h.name }))}
            participants={(participants ?? []).map((p) => ({
              id: p.id,
              name: p.preferred_name ?? p.full_name,
            }))}
          />
        ) : null}
      </div>

      <IncidentsList incidents={incidents} />
    </div>
  );
}
