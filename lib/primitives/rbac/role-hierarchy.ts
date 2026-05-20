import { ROLES, isRole, type Role } from "./types";

/** Roles with management / roster authority — cannot be downgraded to frontline roles. */
export const MANAGERIAL_ROLES: readonly Role[] = [
  "owner",
  "team_leader",
  "roster_coordinator",
] as const;

export function isManagerialRole(role: string): role is Role {
  return MANAGERIAL_ROLES.includes(role as Role);
}

/** Roles an admin may assign to this user (prevents stripping managerial access). */
export function getAssignableRoles(currentRole: Role): Role[] {
  if (isManagerialRole(currentRole)) {
    return [...MANAGERIAL_ROLES];
  }
  return [...ROLES];
}

export function canChangeUserRole(fromRole: Role, toRole: Role): string | null {
  if (!isRole(toRole)) return "Invalid role";
  if (fromRole === toRole) return null;

  if (isManagerialRole(fromRole) && !isManagerialRole(toRole)) {
    return "Managerial roles cannot be changed to support worker or read-only. Assign another management role instead.";
  }

  if (fromRole === "owner" && toRole !== "owner") {
    return "Transfer ownership before changing this user's role away from owner.";
  }

  if (toRole === "owner" && fromRole !== "owner") {
    return "Only the current owner can assign the owner role.";
  }

  return null;
}
