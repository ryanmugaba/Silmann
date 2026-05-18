import type { Rule, RuleCondition } from "@/lib/primitives/rules/types";
import type { RuleRow } from "@/types/database";

export function mapRuleRow(row: RuleRow): Rule {
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
