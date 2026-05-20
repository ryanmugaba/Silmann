import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import { InviteForm } from "./invite-form";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

function unavailableCard() {
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

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return unavailableCard();
  }

  let invitation: {
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
  } | null = null;

  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("invitations")
      .select("email, role, expires_at, accepted_at")
      .eq("token", token)
      .maybeSingle<{
        email: string;
        role: string;
        expires_at: string;
        accepted_at: string | null;
      }>();

    if (error) {
      console.error("[invite]", error);
    } else {
      invitation = data;
    }
  } catch (e) {
    console.error("[invite]", e);
  }

  const expired =
    !invitation ||
    invitation.accepted_at ||
    new Date(invitation.expires_at) < new Date();

  if (expired || !invitation) {
    return unavailableCard();
  }

  const invite = invitation;

  return (
    <AuthCard
      title="Join your team"
      description={`You've been invited as ${invite.role.replace(/_/g, " ")}. Set your password to continue.`}
    >
      <InviteForm token={token} email={invite.email} />
    </AuthCard>
  );
}
