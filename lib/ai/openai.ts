import OpenAI from "openai";
import { isEnvPlaceholder } from "@/lib/env/placeholders";

/** Default model — override with OPENAI_MODEL in .env.local (e.g. gpt-4o, gpt-4o-mini) */
export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function isOpenAIConfigured(): boolean {
  return !isEnvPlaceholder(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient(): OpenAI | null {
  if (!isOpenAIConfigured()) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}
