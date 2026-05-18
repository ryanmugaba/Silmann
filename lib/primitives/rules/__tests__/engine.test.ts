import { describe, expect, it } from "vitest";
import { evaluateRule, groupTriggeredRules } from "../evaluators";
import { buildNoVehicleRule, buildRestrictedPairingRule } from "../builder";
import type { Rule, RuleEvaluationContext } from "../types";

const baseContext: RuleEvaluationContext = {
  organization_id: "org-1",
  house_id: "house-1",
  action: "create_shift",
  shift: {
    house_id: "house-1",
    start_at: "2026-05-20T09:00:00+10:00",
    end_at: "2026-05-20T17:00:00+10:00",
    shift_type: "community_access",
  },
  participant: {
    id: "p-1",
    full_name: "Sandy Example",
    has_vehicle_access: false,
    gender: "female",
    primary_language: "English",
    status: "active",
  },
  worker: {
    id: "w-1",
    full_name: "Alex Worker",
    gender: "male",
    certifications: ["first_aid"],
    languages: ["English"],
    fortnight_hours: 60,
    consecutive_sleepovers: 2,
  },
};

function asRule(
  partial: Omit<Rule, "id" | "created_at" | "updated_at">
): Rule {
  return {
    id: "rule-test",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

describe("rules evaluators", () => {
  it("triggers participant_no_vehicle for community access without vehicle", () => {
    const rule = asRule(buildNoVehicleRule("p-1", "org-1"));
    expect(evaluateRule(rule, baseContext)).toBe(true);
  });

  it("does not trigger participant_no_vehicle when vehicle access exists", () => {
    const rule = asRule(buildNoVehicleRule("p-1", "org-1"));
    const context: RuleEvaluationContext = {
      ...baseContext,
      participant: { ...baseContext.participant!, has_vehicle_access: true },
    };
    expect(evaluateRule(rule, context)).toBe(false);
  });

  it("triggers worker_gender_restriction when genders match restriction", () => {
    const rule = asRule({
      organization_id: "org-1",
      entity_type: "participant",
      entity_id: "p-1",
      condition: { type: "worker_gender_restriction", not_gender: "male" },
      severity: "confirm",
      message: "Male workers restricted",
      requires_reason: true,
      is_active: true,
    });
    expect(evaluateRule(rule, baseContext)).toBe(true);
  });

  it("triggers restricted_pairing for blocked worker-participant pair", () => {
    const rule = asRule(
      buildRestrictedPairingRule("p-1", "w-1", "org-1")
    );
    expect(evaluateRule(rule, baseContext)).toBe(true);
  });

  it("triggers certification_required when cert missing", () => {
    const rule = asRule({
      organization_id: "org-1",
      entity_type: "worker",
      entity_id: "w-1",
      condition: { type: "certification_required", cert_type: "manual_handling" },
      severity: "block",
      message: "Manual handling required",
      requires_reason: false,
      is_active: true,
    });
    expect(evaluateRule(rule, baseContext)).toBe(true);
  });

  it("triggers max_hours_fortnight when over limit", () => {
    const rule = asRule({
      organization_id: "org-1",
      entity_type: "worker",
      entity_id: "w-1",
      condition: { type: "max_hours_fortnight", max: 50 },
      severity: "block",
      message: "Too many hours",
      requires_reason: false,
      is_active: true,
    });
    expect(evaluateRule(rule, baseContext)).toBe(true);
  });

  it("triggers language_required when worker lacks language", () => {
    const rule = asRule({
      organization_id: "org-1",
      entity_type: "participant",
      entity_id: "p-1",
      condition: { type: "language_required", language: "Mandarin" },
      severity: "confirm",
      message: "Mandarin required",
      requires_reason: true,
      is_active: true,
    });
    expect(evaluateRule(rule, baseContext)).toBe(true);
  });

  it("groups triggered rules by severity", () => {
    const grouped = groupTriggeredRules([
      asRule(buildNoVehicleRule("p-1", "org-1")),
      asRule(buildRestrictedPairingRule("p-1", "w-1", "org-1")),
      asRule({
        organization_id: "org-1",
        entity_type: "house",
        entity_id: "house-1",
        condition: { type: "min_notice_hours", hours: 48 },
        severity: "inform",
        message: "Short notice",
        requires_reason: false,
        is_active: true,
      }),
    ]);

    expect(grouped.blocks).toHaveLength(1);
    expect(grouped.confirms).toHaveLength(1);
    expect(grouped.informs).toHaveLength(1);
    expect(grouped.blocks[0]?.severity).toBe("block");
  });
});
