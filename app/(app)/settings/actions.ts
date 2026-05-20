"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeActionError } from "@/lib/errors/action-safe";
import { withPermission } from "@/lib/primitives/rbac/server";
import { PermissionKey, isPermissionKey } from "@/lib/primitives/rbac/types";

const orgSchema = z.object({
  name: z.string().min(1).max(200),
  abn: z.string().max(20).optional(),
  ndisRegistrationNumber: z.string().max(50).optional(),
  timezone: z.string().min(1),
  brandColor: z.string().max(20).optional(),
});

const profileSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  notificationPreferences: z.record(z.unknown()).optional(),
});

const houseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  maxResidents: z.coerce.number().int().positive().optional(),
});

export async function updateOrganization(input: z.infer<typeof orgSchema>) {
  const parsed = orgSchema.parse(input);

  return withPermission(PermissionKey.SETTINGS_EDIT, async (ctx) => {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", ctx.organization_id)
      .single<{ settings: Record<string, unknown> }>();

    const settings = {
      ...(existing?.settings ?? {}),
      ...(parsed.brandColor
        ? { brand_color: parsed.brandColor }
        : {}),
    };

    const { error } = await supabase
      .from("organizations")
      .update({
        name: parsed.name,
        abn: parsed.abn ?? null,
        ndis_registration_number: parsed.ndisRegistrationNumber ?? null,
        timezone: parsed.timezone,
        settings: settings as import("@/types/database").Json,
      })
      .eq("id", ctx.organization_id);

    if (error) {
      return { error: safeActionError(error, "settings") };
    }

    revalidatePath("/settings/organization");
    return { success: true };
  });
}

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const parsed = profileSchema.parse(input);

  return withPermission(PermissionKey.PROFILE_EDIT_OWN, async (ctx) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.fullName,
        phone: parsed.phone ?? null,
        notification_preferences: (parsed.notificationPreferences ??
          undefined) as import("@/types/database").Json | undefined,
      })
      .eq("id", ctx.user_id);

    if (error) {
      return { error: safeActionError(error, "settings") };
    }

    revalidatePath("/settings/profile");
    return { success: true };
  });
}

export async function upsertHouse(input: z.infer<typeof houseSchema>) {
  const parsed = houseSchema.parse(input);

  return withPermission(
    parsed.id ? PermissionKey.HOUSE_EDIT : PermissionKey.HOUSE_CREATE,
    async (ctx) => {
      const supabase = await createClient();

      if (parsed.id) {
        const { error } = await supabase
          .from("houses")
          .update({
            name: parsed.name,
            address: parsed.address ?? null,
            suburb: parsed.suburb ?? null,
            state: parsed.state ?? null,
            postcode: parsed.postcode ?? null,
            max_residents: parsed.maxResidents ?? null,
            updated_by: ctx.user_id,
          })
          .eq("id", parsed.id)
          .eq("organization_id", ctx.organization_id);

        if (error) return { error: safeActionError(error, "settings") };
      } else {
        const { error } = await supabase.from("houses").insert({
          organization_id: ctx.organization_id,
          name: parsed.name,
          address: parsed.address ?? null,
          suburb: parsed.suburb ?? null,
          state: parsed.state ?? null,
          postcode: parsed.postcode ?? null,
          max_residents: parsed.maxResidents ?? null,
          created_by: ctx.user_id,
          updated_by: ctx.user_id,
        });

        if (error) return { error: safeActionError(error, "settings") };
      }

      revalidatePath("/settings/houses");
      return { success: true };
    }
  );
}

export async function updateUserRole(userId: string, role: string) {
  return withPermission(PermissionKey.USER_ROLE_CHANGE, async (ctx) => {
    const { canChangeUserRole } = await import(
      "@/lib/primitives/rbac/role-hierarchy"
    );
    const { isRole } = await import("@/lib/primitives/rbac/types");

    if (!isRole(role)) {
      return { error: "Invalid role" };
    }

    if (role === "owner" && ctx.role !== "owner") {
      return { error: "Only the organisation owner can assign the owner role." };
    }

    const supabase = await createClient();

    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .eq("organization_id", ctx.organization_id)
      .single<{ role: string }>();

    if (!target) {
      return { error: "User not found" };
    }

    if (!isRole(target.role)) {
      return { error: "User has an invalid role — contact support" };
    }

    const blockReason = canChangeUserRole(target.role, role);
    if (blockReason) {
      return { error: blockReason };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .eq("organization_id", ctx.organization_id);

    if (error) return { error: safeActionError(error, "settings") };

    revalidatePath("/settings/users");
    return { success: true };
  });
}

export async function setPermissionGrant(
  roleName: string,
  permissionKey: string,
  granted: boolean
) {
  if (!isPermissionKey(permissionKey)) {
    return { error: "Invalid permission key" };
  }

  return withPermission(PermissionKey.SETTINGS_EDIT, async (ctx) => {
    const supabase = await createClient();

    const { error } = await supabase.from("permissions").upsert(
      {
        organization_id: ctx.organization_id,
        role_name: roleName,
        permission_key: permissionKey,
        granted,
      },
      { onConflict: "organization_id,role_name,permission_key" }
    );

    if (error) return { error: safeActionError(error, "settings") };

    revalidatePath("/settings/permissions");
    return { success: true };
  });
}

export async function setUserActive(userId: string, isActive: boolean) {
  return withPermission(PermissionKey.USER_ROLE_CHANGE, async (ctx) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId)
      .eq("organization_id", ctx.organization_id);

    if (error) return { error: safeActionError(error, "settings") };

    revalidatePath("/settings/users");
    return { success: true };
  });
}

export async function resendUserInvite(userId: string) {
  return withPermission(PermissionKey.USER_ROLE_CHANGE, async (ctx) => {
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .eq("organization_id", ctx.organization_id)
      .single<{ email: string }>();

    if (!profile?.email) {
      return { error: "User not found" };
    }

    const service = (await import("@/lib/supabase/server")).createServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { error } = await service.auth.admin.inviteUserByEmail(profile.email, {
      redirectTo: `${appUrl}/invite/callback`,
    });

    if (error) {
      return { error: safeActionError(error, "settings") };
    }

    return { success: true };
  });
}
