import { NextResponse } from "next/server";
import { MODEL, isOpenAIConfigured } from "@/lib/ai/openai";

/** Public health check for AI — no secrets exposed. */
export async function GET() {
  return NextResponse.json({
    configured: isOpenAIConfigured(),
    model: MODEL,
  });
}
