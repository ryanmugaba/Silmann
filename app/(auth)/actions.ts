"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  actionError,
  actionErrorPublic,
  actionSuccess,
  zodFieldErrors,
  type ActionResult,
} from "@/lib/actions/result";
import { USER_ERROR } from "@/lib/errors/public";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  inviteAcceptSchema,
  loginSchema,
  onboardingHouseSchema,
  onboardingInvitesSchema,
  onboardingOrgSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth";
import type { Role } from "@/lib/primitives/rbac/types";
import type {
  OrganizationInsert,
  ProfileRow,
} from "@/types/database";

function getAppUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (host) {
    const proto = headerStore.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

function inviteExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
}

export async function signIn(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionError("Invalid credentials", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return actionErrorPublic(error, "auth/signIn");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError(USER_ERROR);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle<{ organization_id: string | null }>();

  if (profileError) {
    return actionErrorPublic(profileError, "auth/signIn/profile");
  }

  if (!profile?.organization_id) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}

export async function signInWithGoogle(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const intent =
    formData.get("intent") === "owner_signup" ? "owner_signup" : "login";
  const callbackUrl = new URL("/auth/callback", getAppUrl());
  callbackUrl.searchParams.set("intent", intent);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    if (error) console.error("[auth/google]", error);
    return { error: USER_ERROR };
  }

  return { url: data.url };
}

export async function signUpOwner(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return actionError("Please fix the errors below", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        role: "owner",
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return actionErrorPublic(error, "auth/signUp");
  }

  redirect("/onboarding");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return actionError("Invalid email", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getAppUrl()}/reset-password`,
  });

  if (error) {
    return actionErrorPublic(error, "auth/forgotPassword");
  }

  return actionSuccess(undefined, "Check your email for a reset link.");
}

export async function resetPassword(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return actionError("Please fix the errors below", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return actionErrorPublic(error, "auth/resetPassword");
  }

  redirect("/login");
}

export async function acceptInvite(
  token: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = inviteAcceptSchema.safeParse({
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return actionError("Please fix the errors below", zodFieldErrors(parsed.error));
  }

  type InvitationRow = {
    id: string;
    organization_id: string;
    email: string;
    role: string;
    invited_by: string | null;
    house_ids: string[] | null;
  };

  const service = createServiceClient();
  const { data: invitation, error: inviteError } = await service
    .from("invitations")
    .select("id, organization_id, email, role, invited_by, house_ids")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single<InvitationRow>();

  if (inviteError || !invitation) {
    return actionError("This invitation is invalid or has expired.");
  }

  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: invitation.email,
    password: parsed.data.password,
    options: {
      data: {
        role: invitation.role,
        full_name: parsed.data.fullName,
      },
    },
  });

  if (signUpError || !signUpData.user) {
    return actionError(signUpError?.message ?? "Could not create account.");
  }

  const userId = signUpData.user.id;

  const profilePatch: Partial<ProfileRow> = {
    organization_id: invitation.organization_id,
    full_name: parsed.data.fullName,
    role: invitation.role as Role,
    email: invitation.email,
  };
  await service.from("profiles").update(profilePatch).eq("id", userId);

  const houseIds = (invitation.house_ids as string[] | null) ?? [];
  if (houseIds.length > 0) {
    await service.from("house_assignments").insert(
      houseIds.map((house_id) => ({
        user_id: userId,
        house_id,
        assigned_by: invitation.invited_by,
      }))
    );
  }

  await service
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  redirect("/dashboard");
}

export async function createOrganization(
  _prev: ActionResult<{ organizationId: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ organizationId: string }>> {
  const parsed = onboardingOrgSchema.safeParse({
    name: formData.get("name"),
    abn: formData.get("abn") || undefined,
    ndisRegistrationNumber: formData.get("ndisRegistrationNumber") || undefined,
    timezone: formData.get("timezone") || "Australia/Sydney",
  });

  if (!parsed.success) {
    return actionError("Please fix the errors below", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("You must be signed in.");
  }

  const service = createServiceClient();
  const orgPayload: OrganizationInsert = {
    name: parsed.data.name,
    abn: parsed.data.abn ?? null,
    ndis_registration_number: parsed.data.ndisRegistrationNumber ?? null,
    timezone: parsed.data.timezone,
  };
  const { data: org, error: orgError } = await service
    .from("organizations")
    .insert(orgPayload)
    .select("id")
    .single();

  if (orgError || !org) {
    return actionError(orgError?.message ?? "Could not create organization.");
  }

  const { error: profileError } = await service
    .from("profiles")
    .update({ organization_id: org.id })
    .eq("id", user.id);

  if (profileError) {
    return actionError(profileError.message);
  }

  revalidatePath("/onboarding");
  return actionSuccess({ organizationId: org.id });
}

export async function createFirstHouse(
  organizationId: string,
  _prev: ActionResult<{ houseId: string }> | undefined,
  formData: FormData
): Promise<ActionResult<{ houseId: string }>> {
  const parsed = onboardingHouseSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    suburb: formData.get("suburb") || undefined,
    state: formData.get("state") || undefined,
    postcode: formData.get("postcode") || undefined,
    maxResidents: formData.get("maxResidents") || undefined,
    vehicleMake: formData.get("vehicleMake") || undefined,
    vehicleModel: formData.get("vehicleModel") || undefined,
    vehicleRego: formData.get("vehicleRego") || undefined,
  });

  if (!parsed.success) {
    return actionError("Please fix the errors below", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("You must be signed in.");
  }

  const vehicleInfo =
    parsed.data.vehicleMake || parsed.data.vehicleModel || parsed.data.vehicleRego
      ? {
          make: parsed.data.vehicleMake ?? null,
          model: parsed.data.vehicleModel ?? null,
          registration: parsed.data.vehicleRego ?? null,
        }
      : null;

  const service = createServiceClient();
  const { data: house, error: houseError } = await service
    .from("houses")
    .insert({
      organization_id: organizationId,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      suburb: parsed.data.suburb ?? null,
      state: parsed.data.state ?? null,
      postcode: parsed.data.postcode || null,
      max_residents: parsed.data.maxResidents ?? null,
      vehicle_info: vehicleInfo,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (houseError || !house) {
    return actionError(houseError?.message ?? "Could not create house.");
  }

  await service.from("house_assignments").insert({
    user_id: user.id,
    house_id: house.id,
    assigned_by: user.id,
  });

  revalidatePath("/onboarding");
  return actionSuccess({ houseId: house.id });
}

export async function sendInvitations(
  organizationId: string,
  houseId: string,
  _prev: ActionResult<{ links: { email: string; link: string }[] }> | undefined,
  formData: FormData
): Promise<ActionResult<{ links: { email: string; link: string }[] }>> {
  const emails = formData.getAll("email") as string[];
  const roles = formData.getAll("role") as string[];
  const invites = emails
    .map((email, i) => ({ email, role: roles[i] }))
    .filter((row) => row.email);

  const parsed = onboardingInvitesSchema.safeParse({ invites });

  if (!parsed.success) {
    return actionError("Please fix the errors below", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("You must be signed in.");
  }

  const service = createServiceClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const links: { email: string; link: string }[] = [];

  for (const invite of parsed.data.invites) {
    const token = crypto.randomUUID();
    const { error } = await service.from("invitations").insert({
      organization_id: organizationId,
      email: invite.email,
      role: invite.role,
      invited_by: user.id,
      token,
      house_ids: [houseId],
      expires_at: inviteExpiry(),
    });

    if (error) {
      return actionErrorPublic(error, "auth/invite");
    }

    links.push({
      email: invite.email,
      link: `${baseUrl}/invite/${token}`,
    });
  }

  return actionSuccess({ links });
}

export async function uploadOrgLogo(
  organizationId: string,
  formData: FormData
): Promise<ActionResult<{ logoUrl: string }>> {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return actionError("No file selected.");
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${organizationId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("org-assets")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return actionError(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("org-assets").getPublicUrl(path);

  const service = createServiceClient();
  await service
    .from("organizations")
    .update({ logo_url: publicUrl })
    .eq("id", organizationId);

  return actionSuccess({ logoUrl: publicUrl });
}
