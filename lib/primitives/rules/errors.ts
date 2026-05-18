import type { RuleEvaluationResult } from "./types";

export class RequiresConfirmationError extends Error {
  readonly code = "REQUIRES_CONFIRMATION" as const;
  readonly result: RuleEvaluationResult;

  constructor(result: RuleEvaluationResult) {
    super("Action requires confirmation due to triggered rules");
    this.name = "RequiresConfirmationError";
    this.result = result;
  }
}

export class RulesBlockedError extends Error {
  readonly code = "RULES_BLOCKED" as const;
  readonly result: RuleEvaluationResult;

  constructor(result: RuleEvaluationResult) {
    super("Action blocked by rules");
    this.name = "RulesBlockedError";
    this.result = result;
  }
}
