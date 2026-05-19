/** True when an env value is missing or still a template placeholder. */
export function isEnvPlaceholder(value: string | undefined | null): boolean {
  if (!value?.trim()) return true;
  const v = value.trim().toLowerCase();
  return (
    v.includes("replace_with") ||
    v.includes("placeholder") ||
    v.includes("your-stripe") ||
    v.includes("your-project") ||
    v.includes("xxxxxxxx") ||
    v.includes("price_xxx") ||
    v.includes("whsec_your") ||
    v.endsWith("...")
  );
}
