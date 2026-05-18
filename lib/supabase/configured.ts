/** True when Supabase env vars are present and look usable (not placeholders). */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || url.includes("your-project")) return false;
  return true;
}
