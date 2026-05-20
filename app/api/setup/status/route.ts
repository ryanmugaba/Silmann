import { NextResponse } from "next/server";
import { getConnectionStatus } from "@/lib/env/connection-status";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const status = getConnectionStatus();
  let supabaseReachable = false;
  let supabaseError: string | null = null;

  if (status.supabase.ready) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
    try {
      const client = createClient(url, key);
      const { error } = await client.from("profiles").select("id").limit(1);
      supabaseReachable = !error;
      if (error) supabaseError = error.message;
    } catch (e) {
      supabaseError = e instanceof Error ? e.message : "Connection failed";
    }
  }

  let openaiReachable = false;
  if (status.openai) {
    try {
      const { getOpenAIClient } = await import("@/lib/ai/openai");
      const client = getOpenAIClient();
      if (client) {
        await client.models.list();
        openaiReachable = true;
      }
    } catch {
      openaiReachable = false;
    }
  }

  return NextResponse.json({
    ...status,
    supabaseReachable,
    supabaseError: supabaseError ? "Connection check failed" : null,
    openaiReachable,
  });
}
