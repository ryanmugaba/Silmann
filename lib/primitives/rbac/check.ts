import { roleHasDefaultPermission } from "./default-permissions";
import {
  ForbiddenError,
  PermissionKey,
  type PermissionContext,
  type ResourceScope,
  type Role,
} from "./types";

function resolvePermission(
  context: PermissionContext,
  permission: PermissionKey
): boolean {
  const override = context.custom_permissions[permission];
  if (override !== undefined) {
    return override;
  }
  return roleHasDefaultPermission(context.role, permission);
}

function passesHouseScope(
  context: PermissionContext,
  resource?: ResourceScope
): boolean {
  if (!resource?.house_id) {
    return true;
  }
  if (context.role === "owner") {
    return true;
  }
  return context.house_ids.includes(resource.house_id);
}

function passesUserScope(
  context: PermissionContext,
  resource?: ResourceScope
): boolean {
  if (!resource?.user_id) {
    return true;
  }
  if (context.role === "support_worker") {
    return resource.user_id === context.user_id;
  }
  if (context.role === "read_only" || context.role === "roster_coordinator") {
    return true;
  }
  if (context.role === "owner" || context.role === "team_leader") {
    return true;
  }
  return resource.user_id === context.user_id;
}

/**
 * Returns whether the user may perform `permission`, optionally scoped to a house or user.
 * Owners bypass house assignment checks; workers are limited to their own user_id when provided.
 */
export function can(
  context: PermissionContext,
  permission: PermissionKey,
  resource?: ResourceScope
): boolean {
  if (!resolvePermission(context, permission)) {
    return false;
  }
  if (!passesHouseScope(context, resource)) {
    return false;
  }
  if (!passesUserScope(context, resource)) {
    return false;
  }
  return true;
}

export function requirePermission(
  context: PermissionContext,
  permission: PermissionKey,
  resource?: ResourceScope
): void {
  if (!can(context, permission, resource)) {
    throw new ForbiddenError(permission, resource);
  }
}

/** Test helper — build a minimal permission context without Supabase. */
export function createPermissionContext(
  input: Pick<PermissionContext, "user_id" | "organization_id" | "role"> &
    Partial<Pick<PermissionContext, "house_ids" | "custom_permissions">>
): PermissionContext {
  return {
    house_ids: input.house_ids ?? [],
    custom_permissions: input.custom_permissions ?? {},
    user_id: input.user_id,
    organization_id: input.organization_id,
    role: input.role,
  };
}

export type { PermissionContext, ResourceScope, Role };
