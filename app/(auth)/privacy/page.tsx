import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata = {
  title: "Privacy Policy — Silman",
};

export default function PrivacyPage() {
  return (
    <AuthCard
      title="Privacy Policy"
      description="How Silman handles personal information for NDIS SIL providers."
      wide
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Silman is built for Australian NDIS Supported Independent Living providers.
          This policy describes how we collect, use, and protect information when you
          use the service.
        </p>
        <h2 className="font-display text-base font-semibold text-foreground">
          Information we collect
        </h2>
        <p>
          Account details (name, email, role), participant and worker records required
          for rostering and care coordination, messages, compliance documents, and
          audit logs of significant actions in the platform.
        </p>
        <h2 className="font-display text-base font-semibold text-foreground">
          How we use it
        </h2>
        <p>
          To operate rostering, messaging, reminders, compliance countdowns, and
          reporting for your organisation. We do not sell personal information.
        </p>
        <h2 className="font-display text-base font-semibold text-foreground">
          Storage & security
        </h2>
        <p>
          Data is stored in Supabase (Sydney region) with row-level security per
          organisation and house. Access is limited by role. Contact your organisation
          owner for data access or correction requests.
        </p>
        <h2 className="font-display text-base font-semibold text-foreground">
          Retention & audit history
        </h2>
        <p>
          Silman keeps operational records, audit logs, and soft-deleted records where
          required for NDIS governance, incident review, and compliance evidence.
          Organisation owners can request export or correction support through their
          Silman support contact.
        </p>
        <p className="text-xs text-muted-foreground">
          Last updated: May 2026.
        </p>
      </div>
    </AuthCard>
  );
}
