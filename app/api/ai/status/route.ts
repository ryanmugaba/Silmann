import { NextResponse } from "next/server";
import { MODEL, isOpenAIConfigured, getOpenAIClient } from "@/lib/ai/openai";

export async function GET() {
  const configured = isOpenAIConfigured();
  let reachable = false;

  if (configured) {
    try {
      const client = getOpenAIClient();
      if (client) {
        await client.models.list();
        reachable = true;
      }
    } catch {
      reachable = false;
    }
  }

  return NextResponse.json({
    configured,
    reachable,
    model: MODEL,
  });
}
