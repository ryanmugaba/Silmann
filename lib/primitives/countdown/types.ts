/** NDIS SIL roles — aligned with profiles.role */
export type Role =
  | "owner"
  | "team_leader"
  | "roster_coordinator"
  | "support_worker"
  | "read_only";

export type CountdownSeverity = "green" | "amber" | "red";

export type CountdownStatus =
  | "active"
  | "acknowledged"
  | "resolved"
  | "expired";

export type CountdownResolution = "renewed" | "ceased" | "extended";

export type CountdownEntityType =
  | "medication"
  | "compliance_document"
  | "plan_dates"
  | "worker_certification"
  | "custom";

export interface CountdownThresholdPreset {
  thresholds: number[];
  severity_per_threshold: CountdownSeverity[];
}

/** Days-before-expiry when notifications fire (descending urgency). */
export const DEFAULT_MEDICATION: CountdownThresholdPreset = {
  thresholds: [30, 14, 7, 0],
  severity_per_threshold: ["green", "amber", "red", "red"],
};

export const DEFAULT_COMPLIANCE_DOC: CountdownThresholdPreset = {
  thresholds: [60, 30, 14, 0],
  severity_per_threshold: ["green", "amber", "red", "red"],
};

export const DEFAULT_PLAN_DATES: CountdownThresholdPreset = {
  thresholds: [90, 60, 30, 0],
  severity_per_threshold: ["green", "amber", "red", "red"],
};

export interface CountdownEntity {
  id: string;
  organization_id: string;
  entity_type: CountdownEntityType;
  entity_id: string;
  label: string;
  expiry_date: string;
  thresholds: number[];
  severity_per_threshold: CountdownSeverity[];
  notify_roles: Role[];
  notify_users?: string[];
  house_id?: string | null;
  metadata: Record<string, unknown>;
  last_notified_at?: string | null;
  status: CountdownStatus;
  resolution?: CountdownResolution | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface CountdownEvent {
  id: string;
  countdown_entity_id: string;
  threshold_days: number;
  severity: CountdownSeverity;
  fired_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
}

export interface CountdownStatusResult {
  days_remaining: number;
  severity: CountdownSeverity;
  next_threshold: number | null;
  status: CountdownStatus;
}

export type CountdownEntityInsert = Omit<
  CountdownEntity,
  | "id"
  | "status"
  | "last_notified_at"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "resolution"
>;

export interface CountdownOrgFilters {
  house_id?: string;
  entity_type?: CountdownEntityType;
  status?: CountdownStatus;
  severity?: CountdownSeverity;
}
