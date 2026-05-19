export type Role =
  | "owner"
  | "team_leader"
  | "roster_coordinator"
  | "support_worker"
  | "read_only";

export const ROLES: readonly Role[] = [
  "owner",
  "team_leader",
  "roster_coordinator",
  "support_worker",
  "read_only",
] as const;

export const enum PermissionKey {
  // Participants
  PARTICIPANT_VIEW = "participant:view",
  PARTICIPANT_EDIT = "participant:edit",
  PARTICIPANT_CREATE = "participant:create",
  PARTICIPANT_ARCHIVE = "participant:archive",

  // Workers
  WORKER_VIEW = "worker:view",
  WORKER_EDIT = "worker:edit",
  WORKER_CREATE = "worker:create",
  WORKER_ARCHIVE = "worker:archive",

  // Houses
  HOUSE_VIEW = "house:view",
  HOUSE_EDIT = "house:edit",
  HOUSE_CREATE = "house:create",

  // Roster & shifts
  ROSTER_VIEW = "roster:view",
  ROSTER_EDIT = "roster:edit",
  ROSTER_CREATE = "roster:create",
  ROSTER_DELETE = "roster:delete",
  SHIFT_VIEW_OWN = "shift:view_own",
  SHIFT_EDIT_OWN = "shift:edit_own",
  AVAILABILITY_VIEW_OWN = "availability:view_own",
  AVAILABILITY_SUBMIT = "availability:submit",
  SHIFT_SWAP_REQUEST = "shift_swap:request",
  SHIFT_SWAP_APPROVE = "shift_swap:approve",

  // Medication & compliance
  MEDICATION_VIEW = "medication:view",
  MEDICATION_EDIT = "medication:edit",
  MEDICATION_ADMINISTER = "medication:administer",
  COMPLIANCE_VIEW = "compliance:view",
  COMPLIANCE_SUBMIT = "compliance:submit",
  COMPLIANCE_APPROVE = "compliance:approve",

  // Incidents
  INCIDENT_VIEW = "incident:view",
  INCIDENT_CREATE = "incident:create",
  INCIDENT_EDIT = "incident:edit",
  INCIDENT_CLOSE = "incident:close",

  // Communications
  NOTICE_BOARD_VIEW = "notice_board:view",
  NOTICE_BOARD_POST = "notice_board:post",
  MESSAGE_VIEW = "message:view",
  MESSAGE_SEND = "message:send",

  // Audit & reporting
  AUDIT_LOG_VIEW = "audit_log:view",
  REPORT_VIEW = "report:view",
  REPORT_EXPORT = "report:export",

  // Reminders
  REMINDER_VIEW = "reminder:view",
  REMINDER_EDIT = "reminder:edit",

  // Settings & administration
  SETTINGS_VIEW = "settings:view",
  SETTINGS_EDIT = "settings:edit",
  PROFILE_VIEW_OWN = "profile:view_own",
  PROFILE_EDIT_OWN = "profile:edit_own",
  BILLING_MANAGE = "billing:manage",
  USER_INVITE = "user:invite",
  USER_ROLE_CHANGE = "user:role_change",
  USER_DEACTIVATE = "user:deactivate",
  CUSTOM_ROLE_MANAGE = "custom_role:manage",
  ORG_VIEW = "org:view",
}

/** Every permission key (matrices, validation). */
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = [
  PermissionKey.PARTICIPANT_VIEW,
  PermissionKey.PARTICIPANT_EDIT,
  PermissionKey.PARTICIPANT_CREATE,
  PermissionKey.PARTICIPANT_ARCHIVE,
  PermissionKey.WORKER_VIEW,
  PermissionKey.WORKER_EDIT,
  PermissionKey.WORKER_CREATE,
  PermissionKey.WORKER_ARCHIVE,
  PermissionKey.HOUSE_VIEW,
  PermissionKey.HOUSE_EDIT,
  PermissionKey.HOUSE_CREATE,
  PermissionKey.ROSTER_VIEW,
  PermissionKey.ROSTER_EDIT,
  PermissionKey.ROSTER_CREATE,
  PermissionKey.ROSTER_DELETE,
  PermissionKey.SHIFT_VIEW_OWN,
  PermissionKey.SHIFT_EDIT_OWN,
  PermissionKey.AVAILABILITY_VIEW_OWN,
  PermissionKey.AVAILABILITY_SUBMIT,
  PermissionKey.SHIFT_SWAP_REQUEST,
  PermissionKey.SHIFT_SWAP_APPROVE,
  PermissionKey.MEDICATION_VIEW,
  PermissionKey.MEDICATION_EDIT,
  PermissionKey.MEDICATION_ADMINISTER,
  PermissionKey.COMPLIANCE_VIEW,
  PermissionKey.COMPLIANCE_SUBMIT,
  PermissionKey.COMPLIANCE_APPROVE,
  PermissionKey.INCIDENT_VIEW,
  PermissionKey.INCIDENT_CREATE,
  PermissionKey.INCIDENT_EDIT,
  PermissionKey.INCIDENT_CLOSE,
  PermissionKey.NOTICE_BOARD_VIEW,
  PermissionKey.NOTICE_BOARD_POST,
  PermissionKey.MESSAGE_VIEW,
  PermissionKey.MESSAGE_SEND,
  PermissionKey.AUDIT_LOG_VIEW,
  PermissionKey.REPORT_VIEW,
  PermissionKey.REPORT_EXPORT,
  PermissionKey.REMINDER_VIEW,
  PermissionKey.REMINDER_EDIT,
  PermissionKey.SETTINGS_VIEW,
  PermissionKey.SETTINGS_EDIT,
  PermissionKey.PROFILE_VIEW_OWN,
  PermissionKey.PROFILE_EDIT_OWN,
  PermissionKey.BILLING_MANAGE,
  PermissionKey.USER_INVITE,
  PermissionKey.USER_ROLE_CHANGE,
  PermissionKey.USER_DEACTIVATE,
  PermissionKey.CUSTOM_ROLE_MANAGE,
  PermissionKey.ORG_VIEW,
];

/** Frontline self-service only — not granted to owner/managers by default. */
export const WORKER_SELF_SERVICE_PERMISSIONS: readonly PermissionKey[] = [
  PermissionKey.SHIFT_VIEW_OWN,
  PermissionKey.SHIFT_EDIT_OWN,
  PermissionKey.AVAILABILITY_VIEW_OWN,
  PermissionKey.AVAILABILITY_SUBMIT,
  PermissionKey.SHIFT_SWAP_REQUEST,
  PermissionKey.COMPLIANCE_SUBMIT,
] as const;

const WORKER_SELF_SERVICE_SET = new Set<string>(WORKER_SELF_SERVICE_PERMISSIONS);

/** Owner/org-admin grants — all keys except worker-only self-service. */
export const OWNER_PERMISSION_KEYS: readonly PermissionKey[] =
  ALL_PERMISSION_KEYS.filter((key) => !WORKER_SELF_SERVICE_SET.has(key));

const PERMISSION_KEY_SET = new Set<string>(ALL_PERMISSION_KEYS);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type PermissionContext = {
  user_id: string;
  organization_id: string;
  role: Role;
  house_ids: string[];
  /** Org-level overrides from the permissions table (role_name + permission_key). */
  custom_permissions: Partial<Record<PermissionKey, boolean>>;
};

export type ResourceScope = {
  house_id?: string;
  user_id?: string;
};

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  readonly permission: PermissionKey;
  readonly resource?: ResourceScope;

  constructor(
    permission: PermissionKey,
    resource?: ResourceScope,
    message?: string
  ) {
    super(
      message ??
        `Permission denied: ${permission}${
          resource?.house_id ? ` (house: ${resource.house_id})` : ""
        }${resource?.user_id ? ` (user: ${resource.user_id})` : ""}`
    );
    this.name = "ForbiddenError";
    this.permission = permission;
    this.resource = resource;
  }
}
