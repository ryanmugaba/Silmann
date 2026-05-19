"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SILMAN_TRIAL_LABEL } from "@/lib/billing/constants";
import { cn } from "@/lib/utils";

type StartTrialButtonProps = {
  size?: "default" | "lg";
  className?: string;
  stripeConfigured: boolean;
};

export function StartTrialButton({
  size = "lg",
  className,
  stripeConfigured,
}: StartTrialButtonProps) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not reach billing service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      className={cn("bg-gradient-to-r from-violet-600 to-primary", className)}
      disabled={loading || !stripeConfigured}
      onClick={() => void startCheckout()}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" strokeWidth={1.5} />
      )}
      Start {SILMAN_TRIAL_LABEL.toLowerCase()}
    </Button>
  );
}
