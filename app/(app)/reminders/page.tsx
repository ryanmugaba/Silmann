import { redirect } from "next/navigation";
import {
  endOfWeek,
  isToday,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { Clock } from "lucide-react";
import { CreateReminderModal } from "@/components/reminders/create-modal";
import { RemindersList } from "@/components/reminders/reminders-list";
import { EmptyState } from "@/components/shared/empty-state";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type { ReminderWithAssignee } from "@/types/reminders";

export const metadata = {
  title: "Reminders — Silman",
};

export default async function RemindersPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.REMINDER_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: reminders }, { data: users }, { data: houses }] =
    await Promise.all([
      supabase
        .from("reminders")
        .select(
          `
          id, organization_id, created_by, assigned_to, title, description,
          due_at, recurrence_rule, category, status, house_id,
          related_entity_type, related_entity_id, completed_at, snoozed_until, created_at,
          assignee:assigned_to ( full_name ),
          house:house_id ( name )
        `
        )
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .order("due_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("organization_id", ctx.organization_id)
        .eq("is_active", true)
        .is("deleted_at", null),
      supabase
        .from("houses")
        .select("id, name")
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null),
    ]);

  type RawReminder = {
    id: string;
    organization_id: string;
    created_by: string;
    assigned_to: string | null;
    title: string;
    description: string | null;
    due_at: string;
    recurrence_rule: string | null;
    category: string | null;
    status: string;
    house_id: string | null;
    related_entity_type: string | null;
    related_entity_id: string | null;
    completed_at: string | null;
    snoozed_until: string | null;
    created_at: string;
    assignee: { full_name: string | null } | null;
    house: { name: string } | null;
  };

  const mapped: ReminderWithAssignee[] = (reminders ?? []).map((raw) => {
    const r = raw as RawReminder;
    return {
      id: r.id,
      organization_id: r.organization_id,
      created_by: r.created_by,
      assigned_to: r.assigned_to,
      title: r.title,
      description: r.description,
      due_at: r.due_at,
      recurrence_rule: r.recurrence_rule,
      category: r.category,
      status: r.status as ReminderWithAssignee["status"],
      house_id: r.house_id,
      related_entity_type: r.related_entity_type,
      related_entity_id: r.related_entity_id,
      completed_at: r.completed_at,
      snoozed_until: r.snoozed_until,
      created_at: r.created_at,
      assignee_name: r.assignee?.full_name ?? null,
      house_name: r.house?.name ?? null,
    };
  });

  const now = new Date();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const today = mapped.filter(
    (r) =>
      r.status === "pending" &&
      isToday(new Date(r.due_at))
  );
  const thisWeek = mapped.filter(
    (r) =>
      r.status === "pending" &&
      !isToday(new Date(r.due_at)) &&
      isWithinInterval(new Date(r.due_at), {
        start: startOfDay(now),
        end: weekEnd,
      })
  );
  const later = mapped.filter(
    (r) =>
      r.status === "pending" &&
      new Date(r.due_at) > weekEnd
  );
  const completed = mapped.filter((r) => r.status === "completed");

  const isEmpty =
    today.length === 0 &&
    thisWeek.length === 0 &&
    later.length === 0 &&
    completed.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-heading">
            Reminders
          </h1>
          <p className="text-muted-foreground">
            Tasks and follow-ups for you and your team.
          </p>
        </div>
        <CreateReminderModal
          users={(users ?? []) as { id: string; full_name: string | null }[]}
          houses={(houses ?? []) as { id: string; name: string }[]}
        />
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Clock}
          title="No reminders"
          description="Create a reminder to track tasks, follow-ups, and deadlines."
        />
      ) : (
        <div className="space-y-8">
          <RemindersList title="Today" reminders={today} />
          <RemindersList title="This week" reminders={thisWeek} />
          <RemindersList title="Later" reminders={later} />
          <RemindersList
            title="Completed"
            reminders={completed}
            showComplete
          />
        </div>
      )}
    </div>
  );
}
