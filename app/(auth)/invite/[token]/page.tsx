import { createServiceClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/auth-card";
import { InviteForm } from "./invite-form";
import Link from "next/link";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: invitation } = await service
    .from("invitations")
    .select("email, role, expires_at, accepted_at")
    .eq("token", token)
    .single<{
      email: string;
      role: string;
      expires_at: string;
      accepted_at: string | null;
    }>();

  const expired =
    !invitation ||
    invitation.accepted_at ||
    new Date(invitation.expires_at) < new Date();

  if (expired) {
    return (
      <AuthCard
        title="Invitation unavailable"
        description="This link may have expired or already been used."
        footer={
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in instead
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Ask your team leader to send a new invitation from Silman Settings.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Join your team"
      description={`You've been invited as ${invitation.role.replace(/_/g, " ")}. Set your password to continue.`}
    >
      <InviteForm token={token} email={invitation.email} />
    </AuthCard>
  );
}
