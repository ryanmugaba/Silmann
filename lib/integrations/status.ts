import { getBillingReadiness } from "@/lib/billing/readiness";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import { isEnvPlaceholder } from "@/lib/env/placeholders";

export type IntegrationStatus = "active" | "setup_required" | "planned";

export type IntegrationItem = {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  href?: string;
  setupHint?: string;
};

export function getIntegrations(): IntegrationItem[] {
  const billing = getBillingReadiness();
  const stripeLive = isStripeConfigured();
  const openaiLive = isOpenAIConfigured();
  const resendLive =
    !isEnvPlaceholder(process.env.RESEND_API_KEY) &&
    !isEnvPlaceholder(process.env.RESEND_FROM_EMAIL);

  return [
    {
      id: "supabase",
      name: "Supabase",
      description: "Database, auth, and storage (Sydney)",
      status: isSupabaseConfigured() ? "active" : "setup_required",
      setupHint: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Subscriptions — 14-day trial, then $29.99 AUD/month",
      status: stripeLive ? "active" : "setup_required",
      href: "/settings/billing",
      setupHint: billing.missing.filter((m) => m.toLowerCase().includes("stripe") || m.includes("APP_URL")).join("; ") ||
        "STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL",
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "Silman AI assistant, command bar, and @AI in messages",
      status: openaiLive ? "active" : "setup_required",
      setupHint: "OPENAI_API_KEY (and optional OPENAI_MODEL) in .env.local",
    },
    {
      id: "resend",
      name: "Resend",
      description: "Transactional email notifications",
      status: resendLive ? "active" : "planned",
      setupHint: "RESEND_API_KEY, RESEND_FROM_EMAIL",
    },
    {
      id: "twilio",
      name: "Twilio",
      description: "SMS notifications (future)",
      status: "planned",
    },
  ];
}
