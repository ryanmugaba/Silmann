import {
  OWNER_PERMISSION_KEYS,
  PermissionKey,
  type Role,
} from "./types";

const VIEW_PERMISSIONS: PermissionKey[] = [
  PermissionKey.PARTICIPANT_VIEW,
  PermissionKey.WORKER_VIEW,
  PermissionKey.HOUSE_VIEW,
  PermissionKey.ROSTER_VIEW,
  PermissionKey.MEDICATION_VIEW,
  PermissionKey.COMPLIANCE_VIEW,
  PermissionKey.INCIDENT_VIEW,
  PermissionKey.NOTICE_BOARD_VIEW,
  PermissionKey.MESSAGE_VIEW,
  PermissionKey.AUDIT_LOG_VIEW,
  PermissionKey.REPORT_VIEW,
  PermissionKey.REMINDER_VIEW,
  PermissionKey.SETTINGS_VIEW,
  PermissionKey.ORG_VIEW,
];

const TEAM_LEADER_PERMISSIONS: PermissionKey[] = [
  ...VIEW_PERMISSIONS,
  PermissionKey.PARTICIPANT_EDIT,
  PermissionKey.PARTICIPANT_CREATE,
  PermissionKey.PARTICIPANT_ARCHIVE,
  PermissionKey.WORKER_EDIT,
  PermissionKey.WORKER_CREATE,
  PermissionKey.WORKER_ARCHIVE,
  PermissionKey.HOUSE_EDIT,
  PermissionKey.ROSTER_VIEW,
  PermissionKey.ROSTER_EDIT,
  PermissionKey.ROSTER_CREATE,
  PermissionKey.ROSTER_DELETE,
  PermissionKey.SHIFT_SWAP_APPROVE,
  PermissionKey.MEDICATION_EDIT,
  PermissionKey.MEDICATION_ADMINISTER,
  PermissionKey.COMPLIANCE_APPROVE,
  PermissionKey.INCIDENT_CREATE,
  PermissionKey.INCIDENT_EDIT,
  PermissionKey.INCIDENT_CLOSE,
  PermissionKey.NOTICE_BOARD_POST,
  PermissionKey.MESSAGE_SEND,
  PermissionKey.REMINDER_EDIT,
  PermissionKey.USER_INVITE,
  PermissionKey.REPORT_EXPORT,
];

const ROSTER_COORDINATOR_PERMISSIONS: PermissionKey[] = [
  PermissionKey.HOUSE_VIEW,
  PermissionKey.ROSTER_VIEW,
  PermissionKey.ROSTER_EDIT,
  PermissionKey.ROSTER_CREATE,
  PermissionKey.ROSTER_DELETE,
  PermissionKey.SHIFT_SWAP_APPROVE,
  PermissionKey.NOTICE_BOARD_VIEW,
  PermissionKey.MESSAGE_VIEW,
  PermissionKey.MESSAGE_SEND,
  PermissionKey.SETTINGS_VIEW,
  PermissionKey.PROFILE_VIEW_OWN,
  PermissionKey.PROFILE_EDIT_OWN,
];

const SUPPORT_WORKER_PERMISSIONS: PermissionKey[] = [
  PermissionKey.SHIFT_VIEW_OWN,
  PermissionKey.SHIFT_EDIT_OWN,
  PermissionKey.AVAILABILITY_VIEW_OWN,
  PermissionKey.AVAILABILITY_SUBMIT,
  PermissionKey.SHIFT_SWAP_REQUEST,
  PermissionKey.NOTICE_BOARD_VIEW,
  PermissionKey.MESSAGE_VIEW,
  PermissionKey.MESSAGE_SEND,
  PermissionKey.COMPLIANCE_VIEW,
  PermissionKey.COMPLIANCE_SUBMIT,
  PermissionKey.SETTINGS_VIEW,
  PermissionKey.PROFILE_VIEW_OWN,
  PermissionKey.PROFILE_EDIT_OWN,
];

/** Default permission sets per built-in role (before org-level overrides). */
export const DEFAULT_PERMISSIONS: Record<Role, readonly PermissionKey[]> = {
  owner: OWNER_PERMISSION_KEYS,
  team_leader: TEAM_LEADER_PERMISSIONS,
  roster_coordinator: ROSTER_COORDINATOR_PERMISSIONS,
  support_worker: SUPPORT_WORKER_PERMISSIONS,
  read_only: VIEW_PERMISSIONS,
};

export function roleHasDefaultPermission(
  role: Role,
  permission: PermissionKey
): boolean {
  return DEFAULT_PERMISSIONS[role].includes(permission);
}
