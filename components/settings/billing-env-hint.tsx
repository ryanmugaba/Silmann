import { getBillingReadiness } from "@/lib/billing/readiness";
import { SILMAN_PRICING_TAGLINE } from "@/lib/billing/constants";

export function BillingEnvHint() {
  const readiness = getBillingReadiness();
  if (readiness.ready) return null;

  return (
    <div className="rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      <p className="font-medium">Stripe not fully configured</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
        Copy <code className="text-xs">.env.local.example</code> →{" "}
        <code className="text-xs">.env.local</code> and set:{" "}
        {readiness.missing.join(", ")}. Plan: {SILMAN_PRICING_TAGLINE}. See{" "}
        <code className="text-xs">docs/STRIPE_SETUP.md</code> and{" "}
        <code className="text-xs">docs/DEPLOY.md</code> for production on Vercel.
      </p>
    </div>
  );
}
