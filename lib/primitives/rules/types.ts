export type RuleSeverity = "block" | "confirm" | "inform";

export type RuleEntityType = "participant" | "worker" | "house";

export type RuleCondition =
  | { type: "participant_no_vehicle"; shift_type?: string }
  | { type: "worker_gender_restriction"; not_gender: string }
  | { type: "restricted_pairing"; participant_id: string; worker_id: string }
  | { type: "certification_required"; cert_type: string }
  | { type: "max_hours_fortnight"; max: number }
  | { type: "consecutive_sleepovers"; max: number }
  | { type: "language_required"; language: string }
  | { type: "no_pets_allergy" }
  | { type: "ratio_required"; ratio: string }
  | { type: "min_notice_hours"; hours: number }
  | { type: "participant_status"; allowed_statuses: string[] }
  | { type: "compliance_doc_expired"; doc_type: string; expiry_date?: string };

export type RuleConditionType = RuleCondition["type"];

export interface Rule {
  id: string;
  organization_id: string;
  entity_type: RuleEntityType;
  entity_id: string;
  house_id?: string | null;
  condition: RuleCondition;
  severity: RuleSeverity;
  message: string;
  requires_reason: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface ShiftContext {
  id?: string;
  house_id: string;
  participant_id?: string | null;
  worker_id?: string | null;
  start_at: string;
  end_at: string;
  shift_type: string;
  ratio?: string;
}

export interface ParticipantContext {
  id: string;
  full_name: string;
  has_vehicle_access?: boolean;
  gender?: string | null;
  primary_language?: string | null;
  status?: string;
  allergies?: string[];
  preferences?: Record<string, unknown>;
}

export interface WorkerContext {
  id: string;
  full_name: string;
  gender?: string | null;
  certifications?: string[];
  languages?: string[];
  fortnight_hours?: number;
  consecutive_sleepovers?: number;
}

export type RuleActionType =
  | "create_shift"
  | "assign_shift"
  | "administer_medication"
  | "publish_roster";

export interface RuleEvaluationContext {
  organization_id: string;
  house_id: string;
  action: RuleActionType;
  shift?: ShiftContext;
  participant?: ParticipantContext;
  worker?: WorkerContext;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  passed: boolean;
  blocks: Rule[];
  confirms: Rule[];
  informs: Rule[];
}

export interface RuleOverrideInput {
  rule_id: string;
  action_context: RuleEvaluationContext;
  override_reason: string;
  user_id: string;
  organization_id: string;
}
