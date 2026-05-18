import { createClient } from "@/lib/supabase/server";
import { evaluate } from "./engine";
import {
  RequiresConfirmationError,
  RulesBlockedError,
} from "./errors";
import type { RuleEvaluationContext, RuleEvaluationResult } from "./types";

export interface AttemptActionOptions {
  override_reason?: string;
  user_id: string;
}

export async function logOverride(
  ruleId: string,
  actionContext: RuleEvaluationContext,
  reason: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("rule_overrides").insert({
    organization_id: actionContext.organization_id,
    rule_id: ruleId,
    action_context: actionContext as unknown as import("@/types/database").Json,
    override_reason: reason,
    overridden_by: userId,
  });

  if (error) {
    throw new Error(`Failed to log rule override: ${error.message}`);
  }
}

export async function attemptActionWithRules<T>(
  context: RuleEvaluationContext,
  executeFn: () => Promise<T>,
  options: AttemptActionOptions
): Promise<T> {
  const result = await evaluate(context);

  if (result.blocks.length > 0) {
    throw new RulesBlockedError(result);
  }

  if (result.confirms.length > 0 && !options.override_reason?.trim()) {
    throw new RequiresConfirmationError(result);
  }

  if (options.override_reason?.trim()) {
    for (const rule of result.confirms) {
      await logOverride(
        rule.id,
        context,
        options.override_reason.trim(),
        options.user_id
      );
    }
  }

  return executeFn();
}
