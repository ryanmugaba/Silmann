import OpenAI from "openai";
import { isEnvPlaceholder } from "@/lib/env/placeholders";

/** Default model — override with OPENAI_MODEL in .env.local */
export const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

function resolveApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY;
  if (!raw?.trim()) return undefined;
  const key = raw.trim().replace(/^["']|["']$/g, "");
  if (isEnvPlaceholder(key)) return undefined;
  return key;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(resolveApiKey());
}

export function getOpenAIClient(): OpenAI | null {
  const key = resolveApiKey();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}
