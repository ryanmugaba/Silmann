import OpenAI from "openai";

/** Default model — override with OPENAI_MODEL in .env.local (e.g. gpt-4o, gpt-4o-mini) */
export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.includes("placeholder")) return null;
  return new OpenAI({ apiKey: key });
}
