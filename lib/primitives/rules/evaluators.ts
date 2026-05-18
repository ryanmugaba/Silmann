import type { Rule, RuleCondition, RuleEvaluationContext } from "./types";

export type RuleEvaluator = (rule: Rule, context: RuleEvaluationContext) => boolean;

function shiftTypeMatches(
  context: RuleEvaluationContext,
  expected?: string
): boolean {
  if (!expected) {
    return true;
  }
  return context.shift?.shift_type === expected;
}

const participantNoVehicle: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "participant_no_vehicle" }
  >;
  const expectedShift = condition.shift_type ?? "community_access";
  if (!shiftTypeMatches(context, expectedShift)) {
    return false;
  }
  return context.participant?.has_vehicle_access === false;
};

const workerGenderRestriction: RuleEvaluator = (_rule, context) => {
  const condition = _rule.condition as Extract<
    RuleCondition,
    { type: "worker_gender_restriction" }
  >;
  if (!context.worker?.gender) {
    return false;
  }
  return context.worker.gender.toLowerCase() === condition.not_gender.toLowerCase();
};

const restrictedPairing: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "restricted_pairing" }
  >;
  return (
    context.participant?.id === condition.participant_id &&
    context.worker?.id === condition.worker_id
  );
};

const certificationRequired: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "certification_required" }
  >;
  const certs = context.worker?.certifications ?? [];
  return !certs.map((c) => c.toLowerCase()).includes(condition.cert_type.toLowerCase());
};

const maxHoursFortnight: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "max_hours_fortnight" }
  >;
  const hours = context.worker?.fortnight_hours ?? 0;
  return hours > condition.max;
};

const consecutiveSleepovers: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "consecutive_sleepovers" }
  >;
  const count = context.worker?.consecutive_sleepovers ?? 0;
  return count >= condition.max;
};

const languageRequired: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "language_required" }
  >;
  const languages = [
    context.worker?.languages ?? [],
    context.participant?.primary_language
      ? [context.participant.primary_language]
      : [],
  ].flat();
  const normalized = languages.map((l) => l.toLowerCase());
  return !normalized.includes(condition.language.toLowerCase());
};

const noPetsAllergy: RuleEvaluator = (_rule, context) => {
  const allergies = context.participant?.allergies ?? [];
  const prefs = context.participant?.preferences ?? {};
  const petAllergy =
    allergies.some((a) => a.toLowerCase().includes("pet")) ||
    prefs.no_pets === true;
  const workerHasPet =
    (context.metadata?.worker_has_pet as boolean | undefined) === true;
  return petAllergy && workerHasPet;
};

const ratioRequired: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<RuleCondition, { type: "ratio_required" }>;
  return context.shift?.ratio !== condition.ratio;
};

const minNoticeHours: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<RuleCondition, { type: "min_notice_hours" }>;
  if (!context.shift?.start_at) {
    return false;
  }
  const start = new Date(context.shift.start_at).getTime();
  const now = Date.now();
  const hoursUntil = (start - now) / (1000 * 60 * 60);
  return hoursUntil < condition.hours;
};

const participantStatus: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "participant_status" }
  >;
  const status = context.participant?.status ?? "active";
  return !condition.allowed_statuses.includes(status);
};

const complianceDocExpired: RuleEvaluator = (rule, context) => {
  const condition = rule.condition as Extract<
    RuleCondition,
    { type: "compliance_doc_expired" }
  >;
  if (!context.worker?.id || rule.entity_id !== context.worker.id) {
    return false;
  }
  const expiredDocs =
    (context.metadata?.expired_compliance_docs as string[] | undefined) ?? [];
  return expiredDocs.includes(condition.doc_type);
};

export const EVALUATORS: Record<Rule["condition"]["type"], RuleEvaluator> = {
  participant_no_vehicle: participantNoVehicle,
  worker_gender_restriction: workerGenderRestriction,
  restricted_pairing: restrictedPairing,
  certification_required: certificationRequired,
  max_hours_fortnight: maxHoursFortnight,
  consecutive_sleepovers: consecutiveSleepovers,
  language_required: languageRequired,
  no_pets_allergy: noPetsAllergy,
  ratio_required: ratioRequired,
  min_notice_hours: minNoticeHours,
  participant_status: participantStatus,
  compliance_doc_expired: complianceDocExpired,
};

export function evaluateRule(rule: Rule, context: RuleEvaluationContext): boolean {
  const evaluator = EVALUATORS[rule.condition.type];
  if (!evaluator) {
    return false;
  }
  return evaluator(rule, context);
}

export function groupTriggeredRules(triggered: Rule[]): {
  blocks: Rule[];
  confirms: Rule[];
  informs: Rule[];
} {
  return {
    blocks: triggered.filter((r) => r.severity === "block"),
    confirms: triggered.filter((r) => r.severity === "confirm"),
    informs: triggered.filter((r) => r.severity === "inform"),
  };
}
