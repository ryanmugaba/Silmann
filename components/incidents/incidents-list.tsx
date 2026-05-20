"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  type IncidentListItem,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
} from "@/types/incidents";
import { cn } from "@/lib/utils";

const SEVERITY_VARIANT: Record<
  IncidentSeverity,
  "default" | "secondary" | "destructive" | "outline"
> = {
  low: "secondary",
  medium: "outline",
  high: "default",
  critical: "destructive",
};

export function IncidentsList({ incidents }: { incidents: IncidentListItem[] }) {
  if (incidents.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
        No incidents recorded yet.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-2xl border bg-card shadow-card">
      {incidents.map((incident) => (
        <li key={incident.id}>
          <Link
            href={`/incidents/${incident.id}`}
            className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium">{incident.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(incident.occurred_at), "d MMM yyyy, h:mm a")}
                {incident.house_name ? ` · ${incident.house_name}` : ""}
                {incident.participant_name
                  ? ` · ${incident.participant_name}`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Reported by {incident.reporter_name} ·{" "}
                {INCIDENT_TYPE_LABELS[incident.incident_type as IncidentType]}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge variant={SEVERITY_VARIANT[incident.severity]}>
                {INCIDENT_SEVERITY_LABELS[incident.severity]}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  incident.status === "open" && "border-warning/50 text-warning",
                  incident.status === "investigating" && "border-primary/50"
                )}
              >
                {INCIDENT_STATUS_LABELS[incident.status as IncidentStatus]}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
