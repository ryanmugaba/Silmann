"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeActionError } from "@/lib/errors/action-safe";
import { withPermission } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";

const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  dueAt: z.string().datetime(),
  recurrenceRule: z.string().optional(),
  category: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  houseId: z.string().uuid().optional(),
});

export async function createReminder(input: z.infer<typeof createReminderSchema>) {
  const parsed = createReminderSchema.parse(input);

  return withPermission(PermissionKey.REMINDER_EDIT, async (ctx) => {
    if (
      parsed.houseId &&
      ctx.house_ids.length > 0 &&
      !ctx.house_ids.includes(parsed.houseId)
    ) {
      return { error: "You do not have access to this house" };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("reminders").insert({
      organization_id: ctx.organization_id,
      created_by: ctx.user_id,
      title: parsed.title,
      description: parsed.description ?? null,
      due_at: parsed.dueAt,
      recurrence_rule: parsed.recurrenceRule ?? null,
      category: parsed.category ?? null,
      assigned_to: parsed.assignedTo ?? ctx.user_id,
      house_id: parsed.houseId ?? null,
      status: "pending",
    });

    if (error) {
      return { error: safeActionError(error, "reminders") };
    }

    revalidatePath("/reminders");
    revalidatePath("/dashboard");
    return { success: true };
  });
}

export async function completeReminder(reminderId: string) {
  return withPermission(PermissionKey.REMINDER_EDIT, async () => {
    const supabase = await createClient();

    const { error } = await supabase
      .from("reminders")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", reminderId);

    if (error) {
      return { error: safeActionError(error, "reminders") };
    }

    revalidatePath("/reminders");
    return { success: true };
  });
}

export async function snoozeReminder(reminderId: string, until: string) {
  return withPermission(PermissionKey.REMINDER_EDIT, async () => {
    const supabase = await createClient();

    const { error } = await supabase
      .from("reminders")
      .update({
        status: "snoozed",
        snoozed_until: until,
      })
      .eq("id", reminderId);

    if (error) {
      return { error: safeActionError(error, "reminders") };
    }

    revalidatePath("/reminders");
    return { success: true };
  });
}
