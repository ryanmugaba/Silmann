import { createClient } from "@/lib/supabase/server";
import { can, requirePermission } from "./check";
import {
  ForbiddenError,
  isPermissionKey,
  isRole,
  PermissionKey,
  type PermissionContext,
  type ResourceScope,
  type Role,
} from "./types";

type ProfileRow = {
  id: string;
  organization_id: string | null;
  role: string;
};

type HouseAssignmentRow = {
  house_id: string;
};

type PermissionRow = {
  permission_key: string;
  granted: boolean;
};

export async function getPermissionContext(): Promise<PermissionContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ForbiddenError(
      PermissionKey.SETTINGS_VIEW,
      undefined,
      "Not authenticated"
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organization_id, role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single<ProfileRow>();

  if (profileError || !profile?.organization_id) {
    throw new ForbiddenError(
      PermissionKey.SETTINGS_VIEW,
      undefined,
      "Profile not found or not assigned to an organization"
    );
  }

  if (!isRole(profile.role)) {
    throw new ForbiddenError(
      PermissionKey.SETTINGS_VIEW,
      undefined,
      `Invalid role: ${profile.role}`
    );
  }

  const role: Role = profile.role;
  const organizationId = profile.organization_id;

  const { data: assignments, error: assignmentsError } = await supabase
    .from("house_assignments")
    .select("house_id")
    .eq("user_id", user.id);

  if (assignmentsError) {
    throw new Error(
      `Failed to load house assignments: ${assignmentsError.message}`
    );
  }

  const house_ids = (assignments ?? []).map(
    (row: HouseAssignmentRow) => row.house_id
  );

  const { data: permissionRows, error: permissionsError } = await supabase
    .from("permissions")
    .select("permission_key, granted")
    .eq("organization_id", organizationId)
    .eq("role_name", role);

  if (permissionsError) {
    throw new Error(
      `Failed to load custom permissions: ${permissionsError.message}`
    );
  }

  const custom_permissions: Partial<Record<PermissionKey, boolean>> = {};
  for (const row of permissionRows ?? []) {
    const permissionRow = row as PermissionRow;
    if (isPermissionKey(permissionRow.permission_key)) {
      custom_permissions[permissionRow.permission_key] =
        permissionRow.granted;
    }
  }

  return {
    user_id: user.id,
    organization_id: organizationId,
    role,
    house_ids,
    custom_permissions,
  };
}

/**
 * Runs a server handler only when the current user has the required permission.
 * Intended for Server Actions and route handlers.
 */
export async function withPermission<T>(
  permission: PermissionKey,
  handler: (ctx: PermissionContext) => Promise<T>,
  resource?: ResourceScope
): Promise<T> {
  const ctx = await getPermissionContext();
  requirePermission(ctx, permission, resource);
  return handler(ctx);
}

/** Server-side permission check without throwing. */
export async function checkPermission(
  permission: PermissionKey,
  resource?: ResourceScope
): Promise<boolean> {
  const ctx = await getPermissionContext();
  return can(ctx, permission, resource);
}
