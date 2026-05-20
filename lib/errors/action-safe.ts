import { USER_ERROR, logAndReturnUserError } from "@/lib/errors/public";

/** Log server-side detail; return a safe message for UI. */
export function safeActionError(detail: unknown, context: string): string {
  logAndReturnUserError(context, detail);
  return USER_ERROR;
}
