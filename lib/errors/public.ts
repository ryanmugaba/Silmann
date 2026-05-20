/** Shown to end users — never expose env, API, or stack details in the UI. */
export const USER_ERROR =
  "Something went wrong. Please try again or contact your administrator.";

export const USER_ERROR_UNAVAILABLE =
  "This feature is temporarily unavailable. Please try again later.";

/** Log detail server-side; return a safe message for clients. */
export function logAndReturnUserError(
  context: string,
  detail?: unknown
): typeof USER_ERROR {
  console.error(`[${context}]`, detail);
  return USER_ERROR;
}
