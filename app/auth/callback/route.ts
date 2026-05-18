import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/primitives/rbac/types";

type ProfileSummary = {
  id: string;
  organization_id: string | null;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
};

type InvitationSummary = {
  id: string;
  organization_id: string;
  role: Role;
  invited_by: string | null;
  house_ids: string[] | null;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const intent = requestUrl.searchParams.get("intent");
  const next = requestUrl.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", requestUrl);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=session_missing", requestUrl));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id, role, full_name, avatar_url")
    .eq("id", user.id)
    .single<ProfileSummary>();

  if (!profile) {
    return NextResponse.redirect(new URL("/login?error=profile_missing", requestUrl));
  }

  if (!profile.organization_id) {
    const service = createServiceClient();

    if (user.email) {
      const { data: invitation } = await service
        .from("invitations")
        .select("id, organization_id, role, invited_by, house_ids")
        .eq("email", user.email)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<InvitationSummary>();

      if (invitation) {
        await service
          .from("profiles")
          .update({
            organization_id: invitation.organization_id,
            role: invitation.role,
            full_name:
              profile.full_name ??
              user.user_metadata.full_name ??
              user.user_metadata.name ??
              null,
            avatar_url:
              profile.avatar_url ?? user.user_metadata.avatar_url ?? null,
          })
          .eq("id", user.id);

        const houseIds = invitation.house_ids ?? [];
        if (houseIds.length > 0) {
          await service.from("house_assignments").upsert(
            houseIds.map((house_id) => ({
              user_id: user.id,
              house_id,
              assigned_by: invitation.invited_by,
            })),
            { onConflict: "user_id,house_id" }
          );
        }

        await service
          .from("invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invitation.id);

        return NextResponse.redirect(new URL("/dashboard", requestUrl));
      }
    }

    if (intent === "owner_signup") {
      await service
        .from("profiles")
        .update({
          role: "owner",
          full_name:
            profile.full_name ??
            user.user_metadata.full_name ??
            user.user_metadata.name ??
            null,
          avatar_url:
            profile.avatar_url ?? user.user_metadata.avatar_url ?? null,
        })
        .eq("id", user.id);

      return NextResponse.redirect(new URL("/onboarding", requestUrl));
    }

    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=google_account_not_invited", requestUrl)
    );
  }

  if (next?.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(new URL(next, requestUrl));
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl));
}
