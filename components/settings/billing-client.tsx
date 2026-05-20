"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { StartTrialButton } from "@/components/billing/start-trial-button";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SILMAN_MONTHLY_PRICE,
  SILMAN_PLAN_NAME,
  SILMAN_PRICING_TAGLINE,
  SILMAN_TRIAL_LABEL,
} from "@/lib/billing/constants";
import { isSubscriptionActive } from "@/lib/billing/constants";
import type { SubscriptionStatus } from "@/types/database";

type BillingClientProps = {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeConfigured: boolean;
  organizationName: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeZone: "Australia/Sydney",
  }).format(new Date(iso));
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  incomplete: "Not subscribed",
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment overdue",
  canceled: "Canceled",
  unpaid: "Unpaid",
};

export function BillingClient({
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  stripeConfigured,
  organizationName,
}: BillingClientProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<"portal" | null>(null);
  const checkoutToastShown = useRef(false);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkoutToastShown.current || !checkout) return;
    if (checkout === "success") {
      checkoutToastShown.current = true;
      toast.success("Subscription activated — welcome to Silman!");
    }
    if (checkout === "canceled") {
      checkoutToastShown.current = true;
      toast.message("Checkout canceled — you can start your trial anytime.");
    }
  }, [searchParams]);

  const active = isSubscriptionActive(status);

  async function openPortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not open billing portal");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not reach billing service");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 shadow-card">
        <CardHeader className="border-b bg-gradient-to-br from-violet-500/10 via-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="font-display text-xl">{SILMAN_PLAN_NAME}</CardTitle>
              <CardDescription>
                {organizationName} · one flat price for your whole organisation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-tight">
                {SILMAN_MONTHLY_PRICE}
                <span className="text-lg font-normal text-muted-foreground"> / month</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {SILMAN_PRICING_TAGLINE} · unlimited team members
              </p>
            </div>
            <span
              className={
                active
                  ? "rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400"
                  : "rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-800 dark:text-amber-300"
              }
            >
              {STATUS_LABELS[status]}
            </span>
          </div>

          {active ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                {status === "trialing" ? (
                  <>
                    {SILMAN_TRIAL_LABEL} — first payment on{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(currentPeriodEnd)}
                    </span>
                  </>
                ) : (
                  <>
                    Renews on{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(currentPeriodEnd)}
                    </span>
                    {cancelAtPeriodEnd ? " (cancels at period end)" : null}
                  </>
                )}
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start your {SILMAN_TRIAL_LABEL.toLowerCase()} to unlock roster, participants,
              compliance, Silman AI, and team messaging. You won&apos;t be charged until the
              trial ends.
            </p>
          )}

          {!stripeConfigured ? (
            <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              Billing is not available right now. Please try again later.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {active ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void openPortal()}
                disabled={loading !== null || !stripeConfigured}
              >
                {loading === "portal" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" strokeWidth={1.5} />
                )}
                Manage subscription
              </Button>
            ) : (
              <StartTrialButton stripeConfigured={stripeConfigured} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
