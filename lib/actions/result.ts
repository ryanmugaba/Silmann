import type { z } from "zod";
import { USER_ERROR, logAndReturnUserError } from "@/lib/errors/public";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export function actionSuccess<T>(data?: T, message?: string): ActionResult<T> {
  return { success: true, data, message };
}

export function actionError(
  error: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<never> {
  return { success: false, error, fieldErrors };
}

/** User-safe error for server actions (logs optional detail server-side). */
export function actionErrorPublic(detail?: unknown, context?: string): ActionResult<never> {
  if (context) logAndReturnUserError(context, detail);
  else if (detail !== undefined) console.error(detail);
  return actionError(USER_ERROR);
}

export function zodFieldErrors(
  error: z.ZodError
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}
