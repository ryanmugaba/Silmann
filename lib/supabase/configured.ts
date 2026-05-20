import { isEnvPlaceholder } from "@/lib/env/placeholders";

function cleanEnv(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/^["']|["']$/g, "");
}

/** True when Supabase env vars are present, valid, and not placeholders. */
export function isSupabaseConfigured(): boolean {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !key || !service) return false;
  if (isEnvPlaceholder(url) || isEnvPlaceholder(key) || isEnvPlaceholder(service)) {
    return false;
  }

  try {
    new URL(url);
  } catch {
    return false;
  }

  return true;
}

/** Demo fixtures — disabled in production builds. */
export function shouldUseMockData(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true"
  );
}
