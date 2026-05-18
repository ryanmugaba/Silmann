export type ReminderStatus = "pending" | "completed" | "snoozed" | "cancelled";

export type ReminderRow = {
  id: string;
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_at: string;
  recurrence_rule: string | null;
  category: string | null;
  status: ReminderStatus;
  house_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  created_at: string;
};

export type ReminderWithAssignee = ReminderRow & {
  assignee_name: string | null;
  house_name: string | null;
};
