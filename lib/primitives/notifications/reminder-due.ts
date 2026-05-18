import { createServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/primitives/notifications/send";

/** Notify users about reminders due today (Sydney calendar day). */
export async function processDueReminderNotifications(): Promise<{
  notified: number;
}> {
  const supabase = createServiceClient();
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, organization_id, title, description, assigned_to, created_by, due_at")
    .eq("status", "pending")
    .gte("due_at", start.toISOString())
    .lte("due_at", end.toISOString())
    .is("deleted_at", null);

  let notified = 0;

  for (const reminder of reminders ?? []) {
    const userId = reminder.assigned_to ?? reminder.created_by;
    const result = await sendNotification({
      organization_id: reminder.organization_id,
      user_ids: [userId],
      type: "reminder_due",
      title: `Reminder: ${reminder.title}`,
      body: reminder.description ?? undefined,
      action_url: "/reminders",
      related_entity: {
        entity_type: "reminders",
        entity_id: reminder.id,
      },
    });
    notified += result.sent;
  }

  return { notified };
}
