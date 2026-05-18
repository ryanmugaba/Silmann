import type { z } from "zod";

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
