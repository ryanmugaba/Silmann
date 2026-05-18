export const NOTIFICATION_TYPES = [
  "countdown_threshold",
  "reminder_due",
  "mention",
  "message_in_channel",
  "shift_offered",
  "shift_swap_request",
  "compliance_pending",
  "ai_nudge",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationChannel = "in_app" | "email" | "sms";

export type NotificationPreferences = {
  channels?: Partial<Record<NotificationType, NotificationChannel[]>>;
  email_enabled?: boolean;
  sms_enabled?: boolean;
};
