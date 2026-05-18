import { listShiftsInRange, getAvailabilityGrid, getShiftById } from "@/lib/data/roster-queries";
import {
  cancelShift,
  createShift,
  requestShiftSwap,
  submitAvailability,
  updateShiftTimes,
} from "@/app/(app)/roster/actions";
import { createReminder, completeReminder, snoozeReminder } from "@/app/(app)/reminders/actions";
import {
  acknowledgeAnnouncement,
  createAnnouncement,
} from "@/app/(app)/notice-board/actions";
import { sendShiftComment } from "@/app/(app)/messages/actions";
import { createParticipant } from "@/app/(app)/participants/actions";
import { inviteWorker } from "@/app/(app)/workers/actions";
import { getRosterCommandContext } from "@/lib/ai/roster-context";
import type { PermissionContext } from "@/lib/primitives/rbac/types";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import type { RosteringToolName } from "@/lib/ai/rostering-tools";
import { isSupabaseConfigured } from "@/lib/supabase/configured";

const NAVIGATION_PATHS = {
  dashboard: "/dashboard",
  roster: "/roster",
  participants: "/participants",
  workers: "/workers",
  reminders: "/reminders",
  notice_board: "/notice-board",
  messages: "/messages",
  my_availability: "/my-availability",
  my_compliance: "/my-compliance",
} as const;

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function formDataFrom(input: Record<string, unknown>, mapping: Record<string, string>) {
  const fd = new FormData();
  for (const [inputKey, formKey] of Object.entries(mapping)) {
    const value = input[inputKey];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") fd.append(formKey, item);
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      fd.set(formKey, value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      fd.set(formKey, String(value));
    }
  }
  return fd;
}

function promptCapabilities(ctx: PermissionContext) {
  return {
    settings_mutations: "excluded",
    navigation: Object.values(NAVIGATION_PATHS),
    tools: [
      can(ctx, PermissionKey.ROSTER_VIEW) ? "look up shifts and availability" : null,
      can(ctx, PermissionKey.ROSTER_CREATE) ? "create roster shifts" : null,
      can(ctx, PermissionKey.ROSTER_EDIT) ? "update or cancel shifts" : null,
      can(ctx, PermissionKey.AVAILABILITY_SUBMIT) ? "submit own availability" : null,
      can(ctx, PermissionKey.SHIFT_SWAP_REQUEST) ? "request shift swaps" : null,
      can(ctx, PermissionKey.REMINDER_EDIT) ? "create, complete, and snooze reminders" : null,
      can(ctx, PermissionKey.NOTICE_BOARD_POST) ? "post notice board announcements" : null,
      can(ctx, PermissionKey.NOTICE_BOARD_VIEW) ? "acknowledge notice board posts" : null,
      can(ctx, PermissionKey.MESSAGE_SEND) ? "comment on shift threads" : null,
      can(ctx, PermissionKey.WORKER_CREATE) ? "invite support workers" : null,
      can(ctx, PermissionKey.PARTICIPANT_CREATE) ? "create participant intake records" : null,
    ].filter((item): item is string => Boolean(item)),
  };
}

export async function executeRosterTool(
  name: RosteringToolName,
  input: Record<string, unknown>,
  ctx: PermissionContext
): Promise<Record<string, unknown>> {
  switch (name) {
    case "get_roster_context": {
      if (!can(ctx, PermissionKey.ROSTER_VIEW)) {
        return { error: "Permission denied: roster:view" };
      }
      return await getRosterCommandContext(ctx);
    }

    case "get_app_capabilities": {
      return promptCapabilities(ctx);
    }

    case "navigate_app": {
      const destination = String(input.destination);
      if (destination in NAVIGATION_PATHS) {
        return {
          path: NAVIGATION_PATHS[destination as keyof typeof NAVIGATION_PATHS],
        };
      }
      return { error: "Unknown destination" };
    }

    case "create_shift": {
      if (!can(ctx, PermissionKey.ROSTER_CREATE, { house_id: String(input.house_id) })) {
        return { error: "Permission denied: roster:create" };
      }

      if (!isSupabaseConfigured()) {
        return {
          result: {
            success: true,
            data: { shiftId: `mock-${Date.now()}` },
            message: "Demo mode: shift would be created.",
          },
          preview: {
            house_id: input.house_id,
            participant_id: input.participant_id ?? null,
            worker_id: input.worker_id ?? null,
            start: input.start,
            end: input.end,
            shift_type: input.shift_type,
            ratio: input.ratio ?? "1:1",
            notes: input.notes ?? null,
          },
        };
      }

      const fd = new FormData();
      fd.set("houseId", String(input.house_id));
      if (input.participant_id) fd.set("participantId", String(input.participant_id));
      if (input.worker_id) fd.set("workerId", String(input.worker_id));
      fd.set("startAt", String(input.start));
      fd.set("endAt", String(input.end));
      fd.set("shiftType", String(input.shift_type));
      if (input.ratio) fd.set("ratio", String(input.ratio));
      if (input.notes) fd.set("notes", String(input.notes));
      if (input.override_reason) fd.set("overrideReason", String(input.override_reason));
      const result = await createShift(fd);
      return { result };
    }

    case "update_shift_times": {
      if (!can(ctx, PermissionKey.ROSTER_EDIT)) {
        return { error: "Permission denied: roster:edit" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: shift would be updated." },
          preview: input,
        };
      }
      const fd = formDataFrom(input, {
        shift_id: "shiftId",
        start: "startAt",
        end: "endAt",
        override_reason: "overrideReason",
      });
      return { result: await updateShiftTimes(fd) };
    }

    case "cancel_shift": {
      if (!can(ctx, PermissionKey.ROSTER_EDIT)) {
        return { error: "Permission denied: roster:edit" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: shift would be cancelled." },
          preview: input,
        };
      }
      const fd = formDataFrom(input, {
        shift_id: "shiftId",
        reason: "reason",
      });
      return { result: await cancelShift(fd) };
    }

    case "query_availability": {
      if (!can(ctx, PermissionKey.ROSTER_VIEW)) {
        return { error: "Permission denied" };
      }
      const { cells, isMock } = await getAvailabilityGrid(
        ctx.organization_id,
        input.house_id ? String(input.house_id) : undefined
      );
      const start = String(input.date_range_start);
      const end = String(input.date_range_end);
      const filtered = cells.filter((c) => c.date >= start && c.date <= end);
      return { availability: filtered, isMock };
    }

    case "submit_availability": {
      if (!can(ctx, PermissionKey.AVAILABILITY_SUBMIT, { user_id: ctx.user_id })) {
        return { error: "Permission denied: availability:submit" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: availability would be submitted." },
          preview: { cells: input.cells ?? [] },
        };
      }
      const fd = new FormData();
      fd.set("cells", JSON.stringify(input.cells ?? []));
      return { result: await submitAvailability(fd) };
    }

    case "request_shift_swap": {
      if (!can(ctx, PermissionKey.SHIFT_SWAP_REQUEST, { user_id: ctx.user_id })) {
        return { error: "Permission denied: shift_swap:request" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: swap request would be submitted." },
          preview: input,
        };
      }
      const fd = formDataFrom(input, {
        shift_id: "shiftId",
        target_worker_id: "targetWorkerId",
        reason: "reason",
      });
      return { result: await requestShiftSwap(fd) };
    }

    case "find_replacement": {
      if (!can(ctx, PermissionKey.ROSTER_VIEW)) {
        return { error: "Permission denied" };
      }
      const { shift } = await getShiftById(
        String(input.shift_id),
        ctx.organization_id
      );
      if (!shift) return { error: "Shift not found" };
      const { cells } = await getAvailabilityGrid(ctx.organization_id, shift.houseId);
      const date = shift.startAt.slice(0, 10);
      const available = cells.filter(
        (c) =>
          c.date === date &&
          (c.status === "available" || c.status === "preferred") &&
          !c.hasShift
      );
      return { shift, candidates: available };
    }

    case "check_schads_compliance": {
      return {
        worker_id: input.worker_id,
        fortnight_hours: 38,
        max_hours: 76,
        compliant: true,
        note: "SCHADS check uses placeholder data until payroll integration.",
      };
    }

    case "get_unfilled_shifts": {
      if (!can(ctx, PermissionKey.ROSTER_VIEW)) {
        return { error: "Permission denied" };
      }
      const { shifts, isMock } = await listShiftsInRange(
        ctx.organization_id,
        `${input.date_range_start}T00:00:00.000Z`,
        `${input.date_range_end}T23:59:59.999Z`,
        { status: "unfilled" }
      );
      return { shifts, isMock };
    }

    case "create_reminder": {
      if (!can(ctx, PermissionKey.REMINDER_EDIT)) {
        return { error: "Permission denied: reminder:edit" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: reminder would be created." },
          preview: input,
        };
      }
      return {
        result: await createReminder({
          title: String(input.title),
          description: toOptionalString(input.description),
          dueAt: String(input.due_at),
          recurrenceRule: toOptionalString(input.recurrence_rule),
          category: toOptionalString(input.category),
          assignedTo: toOptionalString(input.assigned_to),
          houseId: toOptionalString(input.house_id),
        }),
      };
    }

    case "complete_reminder": {
      if (!can(ctx, PermissionKey.REMINDER_EDIT)) {
        return { error: "Permission denied: reminder:edit" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: reminder would be completed." },
          preview: input,
        };
      }
      return { result: await completeReminder(String(input.reminder_id)) };
    }

    case "snooze_reminder": {
      if (!can(ctx, PermissionKey.REMINDER_EDIT)) {
        return { error: "Permission denied: reminder:edit" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: reminder would be snoozed." },
          preview: input,
        };
      }
      return {
        result: await snoozeReminder(String(input.reminder_id), String(input.until)),
      };
    }

    case "create_notice": {
      if (!can(ctx, PermissionKey.NOTICE_BOARD_POST)) {
        return { error: "Permission denied: notice_board:post" };
      }
      const targetRoles = toStringArray(input.target_roles);
      const targetHouses = toStringArray(input.target_houses);
      const targetUserIds = toStringArray(input.target_user_ids);
      const broadcastConfirmed = input.broadcast_confirmed === true;
      if (
        !broadcastConfirmed &&
        targetRoles.length === 0 &&
        targetHouses.length === 0 &&
        targetUserIds.length === 0
      ) {
        return {
          error:
            "Notice audience is required. Ask who should receive it, or confirm this is for everyone.",
        };
      }
      const payload = {
        title: String(input.title),
        content: String(input.content),
        category: toOptionalString(input.category) ?? "general",
        priority: input.priority === "urgent" ? "urgent" as const : "standard" as const,
        requiresAcknowledgment: input.requires_acknowledgment === true,
        pinned: input.pinned === true,
        targetAudience: {
          roles: targetRoles,
          houses: targetHouses,
          userIds: targetUserIds,
        },
        scheduledFor: toOptionalString(input.scheduled_for),
        expiresAt: toOptionalString(input.expires_at),
      };
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: notice would be posted." },
          preview: payload,
        };
      }
      return { result: await createAnnouncement(payload) };
    }

    case "acknowledge_notice": {
      if (!can(ctx, PermissionKey.NOTICE_BOARD_VIEW)) {
        return { error: "Permission denied: notice_board:view" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: notice would be acknowledged." },
          preview: input,
        };
      }
      return {
        result: await acknowledgeAnnouncement(String(input.announcement_id)),
      };
    }

    case "send_shift_comment": {
      if (!can(ctx, PermissionKey.MESSAGE_SEND)) {
        return { error: "Permission denied: message:send" };
      }
      const content = String(input.content);
      if (/@AI\b/i.test(content)) {
        return { error: "Shift comments sent by AI cannot mention @AI." };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: { success: true, message: "Demo mode: shift comment would be sent." },
          preview: input,
        };
      }
      return {
        result: await sendShiftComment({
          shiftId: String(input.shift_id),
          content,
        }),
      };
    }

    case "invite_worker": {
      if (!can(ctx, PermissionKey.WORKER_CREATE)) {
        return { error: "Permission denied: worker:create" };
      }
      const houseIds = toStringArray(input.house_ids);
      if (
        ctx.role !== "owner" &&
        ctx.house_ids.length > 0 &&
        houseIds.some((houseId) => !ctx.house_ids.includes(houseId))
      ) {
        return { error: "Permission denied: worker invite outside house scope" };
      }
      if (!isSupabaseConfigured()) {
        return {
          result: {
            success: true,
            data: { inviteToken: "mock-invite-token" },
            message: "Demo mode: worker invitation would be sent.",
          },
          preview: input,
        };
      }
      const fd = formDataFrom(input, {
        email: "email",
        employment_type: "employmentType",
        house_ids: "houseIds",
      });
      return { result: await inviteWorker(fd) };
    }

    case "create_participant": {
      if (!can(ctx, PermissionKey.PARTICIPANT_CREATE, { house_id: String(input.house_id) })) {
        return { error: "Permission denied: participant:create" };
      }
      const payload = {
        full_name: String(input.full_name),
        preferred_name: toOptionalString(input.preferred_name),
        date_of_birth: toOptionalString(input.date_of_birth) ?? "",
        ndis_number: String(input.ndis_number),
        gender: toOptionalString(input.gender),
        primary_language: toOptionalString(input.primary_language),
        secondary_languages: [],
        cultural_background: undefined,
        photo_url: "",
        house_id: String(input.house_id),
        plan_start_date: toOptionalString(input.plan_start_date) ?? "",
        plan_end_date: toOptionalString(input.plan_end_date) ?? "",
        plan_total_budget: undefined,
        plan_budget_by_category: {},
        goals: [],
        dietary: {},
        preferences: {},
        has_vehicle_access: input.has_vehicle_access === true,
        mobility_aids: [],
        communication_methods: [],
        behaviour_support_plan_url: "",
        emergency_contacts: [
          {
            name: String(input.emergency_contact_name),
            relationship: String(input.emergency_contact_relationship),
            phone: String(input.emergency_contact_phone),
            email: "",
          },
        ],
        gp_details: {},
      };
      if (!isSupabaseConfigured()) {
        return {
          result: {
            success: true,
            data: { id: `mock-participant-${Date.now()}` },
            message: "Demo mode: participant would be created.",
          },
          preview: payload,
        };
      }
      return { result: await createParticipant(payload) };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
