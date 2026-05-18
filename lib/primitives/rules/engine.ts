import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { evaluateRule, groupTriggeredRules } from "./evaluators";
import type {
  Rule,
  RuleCondition,
  RuleEvaluationContext,
  RuleEvaluationResult,
} from "./types";

type RuleRow = Database["public"]["Tables"]["rules"]["Row"];

function mapRule(row: RuleRow): Rule {
  return {
    id: row.id,
    organization_id: row.organization_id,
    entity_type: row.entity_type as Rule["entity_type"],
    entity_id: row.entity_id,
    house_id: row.house_id,
    condition: row.condition as RuleCondition,
    severity: row.severity as Rule["severity"],
    message: row.message,
    requires_reason: row.requires_reason,
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
    deleted_at: row.deleted_at,
  };
}

function entityIdsFromContext(context: RuleEvaluationContext): string[] {
  const ids: string[] = [];
  if (context.participant?.id) {
    ids.push(context.participant.id);
  }
  if (context.worker?.id) {
    ids.push(context.worker.id);
  }
  if (context.house_id) {
    ids.push(context.house_id);
  }
  return ids;
}

export async function loadApplicableRules(
  context: RuleEvaluationContext
): Promise<Rule[]> {
  const supabase = await createClient();
  const entityIds = entityIdsFromContext(context);

  if (entityIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("rules")
    .select("*")
    .eq("organization_id", context.organization_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .in("entity_id", entityIds);

  if (error) {
    throw new Error(`Failed to load rules: ${error.message}`);
  }

  return (data ?? [])
    .map(mapRule)
    .filter(
      (rule) =>
        rule.house_id == null || rule.house_id === context.house_id
    );
}

export async function evaluate(
  context: RuleEvaluationContext,
  rules?: Rule[]
): Promise<RuleEvaluationResult> {
  const applicable = rules ?? (await loadApplicableRules(context));
  const triggered = applicable.filter((rule) => evaluateRule(rule, context));
  const grouped = groupTriggeredRules(triggered);

  return {
    passed: grouped.blocks.length === 0,
    ...grouped,
  };
}
