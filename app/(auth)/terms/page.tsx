import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata = {
  title: "Terms of Service — Silman",
};

export default function TermsPage() {
  return (
    <AuthCard
      title="Terms of Service"
      description="Terms for using Silman as an NDIS SIL provider."
      wide
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          By using Silman you agree to use the platform only for lawful NDIS SIL
          operations, to keep login credentials secure, and to ensure data entered
          about participants and workers is accurate and used for care coordination.
        </p>
        <h2 className="font-display text-base font-semibold text-foreground">
          Your responsibilities
        </h2>
        <p>
          Organisation owners are responsible for user access, house assignments, and
          compliance with NDIS Practice Standards. Silman provides tools; clinical and
          rostering decisions remain with your organisation.
        </p>
        <h2 className="font-display text-base font-semibold text-foreground">
          Availability
        </h2>
        <p>
          During the pilot, the service is provided as-is with best-effort support.
          Scheduled maintenance will be communicated in advance where possible.
        </p>
        <p className="text-xs">
          Pilot placeholder — replace with counsel-reviewed terms before production
          go-live.
        </p>
      </div>
    </AuthCard>
  );
}
