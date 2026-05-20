export const INCIDENT_TYPES = [
  "injury",
  "behaviour",
  "medication",
  "property",
  "restrictive_practice",
  "other",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = ["open", "investigating", "closed"] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  injury: "Injury or illness",
  behaviour: "Behaviour support",
  medication: "Medication",
  property: "Property / environment",
  restrictive_practice: "Restrictive practice",
  other: "Other",
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  closed: "Closed",
};

export type IncidentListItem = {
  id: string;
  title: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string;
  house_name: string | null;
  participant_name: string | null;
  reporter_name: string;
};

export type IncidentDetail = IncidentListItem & {
  description: string;
  immediate_actions: string | null;
  follow_up_notes: string | null;
  house_id: string | null;
  participant_id: string | null;
  closed_at: string | null;
  created_at: string;
};
