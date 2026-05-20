import { isOpenAIConfigured } from "@/lib/ai/openai";
import { isEnvPlaceholder } from "@/lib/env/placeholders";

export type EnvCheck = {
  key: string;
  label: string;
  set: boolean;
  required: boolean;
};

export type ConnectionStatus = {
  supabase: {
    url: boolean;
    anonKey: boolean;
    serviceRole: boolean;
    ready: boolean;
  };
  openai: boolean;
  appUrl: boolean;
  checks: EnvCheck[];
  ready: boolean;
};

function cleanEnv(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/^["']|["']$/g, "");
}

export function getConnectionStatus(): ConnectionStatus {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRole = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const appUrl = cleanEnv(process.env.NEXT_PUBLIC_APP_URL);

  const urlOk = Boolean(url && !isEnvPlaceholder(url));
  let urlValid = false;
  if (urlOk) {
    try {
      new URL(url!);
      urlValid = true;
    } catch {
      urlValid = false;
    }
  }

  const anonOk = Boolean(anonKey && !isEnvPlaceholder(anonKey));
  const serviceOk = Boolean(serviceRole && !isEnvPlaceholder(serviceRole));
  const appUrlOk = Boolean(appUrl && !isEnvPlaceholder(appUrl));

  const checks: EnvCheck[] = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "Supabase project URL",
      set: urlValid,
      required: true,
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      label: "Supabase anon key",
      set: anonOk,
      required: true,
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      label: "Supabase service role key",
      set: serviceOk,
      required: true,
    },
    {
      key: "OPENAI_API_KEY",
      label: "OpenAI API key",
      set: isOpenAIConfigured(),
      required: false,
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "App URL (e.g. http://localhost:3000)",
      set: appUrlOk,
      required: false,
    },
  ];

  const supabaseReady = urlValid && anonOk && serviceOk;

  return {
    supabase: {
      url: urlValid,
      anonKey: anonOk,
      serviceRole: serviceOk,
      ready: supabaseReady,
    },
    openai: isOpenAIConfigured(),
    appUrl: appUrlOk,
    checks,
    ready: supabaseReady,
  };
}
