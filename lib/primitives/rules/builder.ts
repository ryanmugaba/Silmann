import type { Rule, RuleCondition, RuleEntityType, RuleSeverity } from "./types";

export interface BuildRuleInput {
  organization_id: string;
  entity_type: RuleEntityType;
  entity_id: string;
  house_id?: string | null;
  condition: RuleCondition;
  severity?: RuleSeverity;
  message?: string;
  requires_reason?: boolean;
  created_by?: string;
}

const DEFAULT_MESSAGES: Record<RuleCondition["type"], string> = {
  participant_no_vehicle:
    "Participant does not have vehicle access for community access shifts.",
  worker_gender_restriction:
    "Worker gender does not match participant preference for this shift.",
  restricted_pairing:
    "This participant and worker pairing is restricted.",
  certification_required: "Required certification is missing for this worker.",
  max_hours_fortnight: "Worker would exceed maximum fortnightly hours.",
  consecutive_sleepovers: "Worker has reached consecutive sleepover limit.",
  language_required: "Required language capability is not met for this shift.",
  no_pets_allergy: "Worker has pets but participant has a pet allergy.",
  ratio_required: "Shift ratio does not meet participant support requirements.",
  min_notice_hours: "Shift does not meet minimum notice period.",
  participant_status: "Participant is not in an allowed status for this action.",
  compliance_doc_expired: "Worker compliance document has expired.",
};

export function buildRule(input: BuildRuleInput): Omit<Rule, "id" | "created_at" | "updated_at"> {
  const severity = input.severity ?? defaultSeverity(input.condition.type);
  const message =
    input.message ?? DEFAULT_MESSAGES[input.condition.type] ?? "Rule triggered.";

  return {
    organization_id: input.organization_id,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    house_id: input.house_id ?? null,
    condition: input.condition,
    severity,
    message,
    requires_reason: input.requires_reason ?? severity === "confirm",
    is_active: true,
    created_by: input.created_by ?? null,
    updated_by: null,
    deleted_at: null,
  };
}

function defaultSeverity(type: RuleCondition["type"]): RuleSeverity {
  switch (type) {
    case "restricted_pairing":
    case "certification_required":
    case "max_hours_fortnight":
      return "block";
    case "participant_no_vehicle":
    case "worker_gender_restriction":
    case "no_pets_allergy":
      return "confirm";
    default:
      return "inform";
  }
}

export function buildNoVehicleRule(
  participantId: string,
  organizationId: string,
  houseId?: string
) {
  return buildRule({
    organization_id: organizationId,
    entity_type: "participant",
    entity_id: participantId,
    house_id: houseId,
    condition: { type: "participant_no_vehicle", shift_type: "community_access" },
    severity: "confirm",
    message:
      "This participant has no vehicle access. Confirm community access shift is appropriate.",
  });
}

export function buildGenderRestrictionRule(
  participantId: string,
  organizationId: string,
  notGender: string,
  houseId?: string
) {
  return buildRule({
    organization_id: organizationId,
    entity_type: "participant",
    entity_id: participantId,
    house_id: houseId,
    condition: { type: "worker_gender_restriction", not_gender: notGender },
    severity: "confirm",
    message: `Only non-${notGender} workers should be rostered for this participant.`,
  });
}

export function buildRestrictedPairingRule(
  participantId: string,
  workerId: string,
  organizationId: string,
  houseId?: string
) {
  return buildRule({
    organization_id: organizationId,
    entity_type: "participant",
    entity_id: participantId,
    house_id: houseId,
    condition: { type: "restricted_pairing", participant_id: participantId, worker_id: workerId },
    severity: "block",
    message: "This worker cannot be rostered with this participant.",
  });
}

export function buildLanguageRequiredRule(
  participantId: string,
  organizationId: string,
  language: string,
  houseId?: string
) {
  return buildRule({
    organization_id: organizationId,
    entity_type: "participant",
    entity_id: participantId,
    house_id: houseId,
    condition: { type: "language_required", language },
    severity: "confirm",
    message: `Worker must speak ${language} for this participant.`,
  });
}
