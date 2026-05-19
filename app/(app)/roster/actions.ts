"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, zodFieldErrors } from "@/lib/actions/result";
import { attemptActionWithRules } from "@/lib/primitives/rules/actions";
import {
  RequiresConfirmationError,
  RulesBlockedError,
} from "@/lib/primitives/rules/errors";
import { evaluate } from "@/lib/primitives/rules/engine";
import { withPermission } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import type { RuleEvaluationContext } from "@/lib/primitives/rules/types";
import { listShiftsInRange } from "@/lib/data/roster-queries";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import {
  cancelShiftSchema,
  createShiftSchema,
  shiftSwapRequestSchema,
  submitAvailabilitySchema,
  updateShiftSchema,
  updateShiftTimesSchema,
} from "@/lib/validators/roster";
import type { Database, ShiftRow } from "@/types/database";

function buildShiftRuleContext(
  organizationId: string,
  input: {
    houseId: string;
    participantId?: string | null;
    workerId?: string | null;
    startAt: string;
    endAt: string;
    shiftType: string;
    ratio?: string;
  }
): RuleEvaluationContext {
  return {
    organization_id: organizationId,
    house_id: input.houseId,
    action: "create_shift",
    shift: {
      house_id: input.houseId,
      participant_id: input.participantId ?? null,
      worker_id: input.workerId ?? null,
      start_at: input.startAt,
      end_at: input.endAt,
      shift_type: input.shiftType,
      ratio: input.ratio ?? "1:1",
    },
    participant: input.participantId
      ? { id: input.participantId, full_name: "" }
      : undefined,
    worker: input.workerId
      ? { id: input.workerId, full_name: "" }
      : undefined,
  };
}

export async function getShiftsForRange(rangeStart: string, rangeEnd: string) {
  return withPermission(PermissionKey.ROSTER_VIEW, async (ctx) => {
    const { shifts, isMock } = await listShiftsInRange(
      ctx.organization_id,
      rangeStart,
      rangeEnd
    );
    return actionSuccess({ shifts, isMock });
  });
}

export async function getRosterFormOptions(houseId: string) {
  return withPermission(PermissionKey.ROSTER_CREATE, async (ctx) => {
    if (!isSupabaseConfigured()) {
      return actionSuccess({
        workers: [
          { id: "p1", name: "Sarah Chen" },
          { id: "p2", name: "James O'Brien" },
        ],
        participants: [
          { id: "part-1", name: "Alex Morgan" },
          { id: "part-2", name: "Jordan Lee" },
        ],
      });
    }

    const supabase = await createClient();

    const { data: participants } = await supabase
      .from("participants")
      .select("id, full_name, preferred_name")
      .eq("organization_id", ctx.organization_id)
      .eq("house_id", houseId)
      .is("deleted_at", null)
      .order("full_name");

    const { data: assignments } = await supabase
      .from("house_assignments")
      .select("user_id, profiles!inner(full_name)")
      .eq("house_id", houseId)
      .returns<{ user_id: string; profiles: { full_name: string | null } }[]>();

    const workers = (assignments ?? []).map((a) => ({
      id: a.user_id,
      name: a.profiles?.full_name ?? "Worker",
    }));

    return actionSuccess({
      workers,
      participants: (participants ?? []).map((p) => ({
        id: p.id,
        name: p.preferred_name ?? p.full_name,
      })),
    });
  });
}

export async function getShiftDetailMeta(shiftId: string) {
  return withPermission(PermissionKey.ROSTER_VIEW, async (ctx) => {
    if (!isSupabaseConfigured()) {
      return actionSuccess({
        audit: [
          {
            action: "create",
            user_name: "Demo Manager",
            created_at: new Date().toISOString(),
          },
        ],
        comments: [
          {
            id: "c1",
            author: "Sarah Chen",
            content: "Handover notes in the house log.",
            created_at: new Date().toISOString(),
          },
        ],
        channelId: null,
      });
    }

    const supabase = await createClient();
    const { data: audit } = await supabase
      .from("audit_log")
      .select("action, created_at, profiles(full_name)")
      .eq("entity_type", "shifts")
      .eq("entity_id", shiftId)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<
        Array<{
          action: string;
          created_at: string;
          profiles: { full_name: string | null } | null;
        }>
      >();

    const { data: shift } = await supabase
      .from("shifts")
      .select("id")
      .eq("id", shiftId)
      .single<{ id: string }>();

    let comments: Array<{
      id: string;
      author: string;
      content: string;
      created_at: string;
    }> = [];
    let channelId: string | null = null;

    if (shift) {
      const { getOrCreateShiftChannel } = await import("@/lib/messaging/shift-channel");
      const channelResult = await getOrCreateShiftChannel(supabase, ctx, shiftId);

      if ("channelId" in channelResult) {
        channelId = channelResult.channelId;
        const { data: msgs } = await supabase
          .from("messages")
          .select("id, content, created_at, attachments, profiles(full_name)")
          .eq("channel_id", channelResult.channelId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(20)
          .returns<
            Array<{
              id: string;
              content: string;
              created_at: string;
              attachments: unknown;
              profiles: { full_name: string | null } | null;
            }>
          >();

        comments = (msgs ?? []).map((m) => ({
          id: m.id,
          author: m.profiles?.full_name ?? "User",
          content: m.content,
          created_at: m.created_at,
        }));
      }
    }

    return actionSuccess({
      audit: (audit ?? []).map((a) => ({
        action: a.action,
        user_name: a.profiles?.full_name ?? "System",
        created_at: a.created_at,
      })),
      comments,
      channelId,
    });
  });
}

export async function createShift(formData: FormData) {
  return withPermission(
    PermissionKey.ROSTER_CREATE,
    async (ctx) => {
      const parsed = createShiftSchema.safeParse({
        houseId: formData.get("houseId"),
        participantId: formData.get("participantId") || null,
        workerId: formData.get("workerId") || null,
        startAt: formData.get("startAt"),
        endAt: formData.get("endAt"),
        shiftType: formData.get("shiftType"),
        ratio: formData.get("ratio") || "1:1",
        notes: formData.get("notes") || undefined,
        overrideReason: formData.get("overrideReason") || undefined,
      });

      if (!parsed.success) {
        return actionError("Invalid input", zodFieldErrors(parsed.error));
      }

      const ruleContext = buildShiftRuleContext(ctx.organization_id, parsed.data);

      if (ctx.house_ids.length > 0 && !ctx.house_ids.includes(parsed.data.houseId)) {
        return actionError("You do not have access to this house");
      }

      const execute = async () => {
        if (!isSupabaseConfigured()) {
          return { shiftId: `mock-${Date.now()}` };
        }

        const supabase = await createClient();
        const status = parsed.data.workerId ? "confirmed" : "unfilled";

        const { data, error } = await supabase
          .from("shifts")
          .insert({
            organization_id: ctx.organization_id,
            house_id: parsed.data.houseId,
            participant_id: parsed.data.participantId ?? null,
            worker_id: parsed.data.workerId ?? null,
            start_at: parsed.data.startAt,
            end_at: parsed.data.endAt,
            shift_type: parsed.data.shiftType,
            status,
            ratio: parsed.data.ratio,
            notes: parsed.data.notes ?? null,
            created_by: ctx.user_id,
          })
          .select("id")
          .single();

        if (error) throw new Error(error.message);
        return { shiftId: data?.id };
      };

      try {
        const result = await attemptActionWithRules(
          ruleContext,
          execute,
          {
            user_id: ctx.user_id,
            override_reason: parsed.data.overrideReason,
          }
        );

        revalidatePath("/roster");
        return actionSuccess(result, "Shift created");
      } catch (e) {
        if (e instanceof RulesBlockedError) {
          return actionError(
            e.result.blocks.map((r) => r.message).join(" ")
          );
        }
        if (e instanceof RequiresConfirmationError) {
          return actionError("CONFIRMATION_REQUIRED", {
            _form: e.result.confirms.map((r) => r.message),
          });
        }
        throw e;
      }
    },
    { house_id: formData.get("houseId")?.toString() }
  );
}

export async function evaluateShiftRules(formData: FormData) {
  return withPermission(PermissionKey.ROSTER_CREATE, async (ctx) => {
    const parsed = createShiftSchema.safeParse({
      houseId: formData.get("houseId"),
      participantId: formData.get("participantId") || null,
      workerId: formData.get("workerId") || null,
      startAt: formData.get("startAt"),
      endAt: formData.get("endAt"),
      shiftType: formData.get("shiftType"),
      ratio: formData.get("ratio") || "1:1",
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (ctx.house_ids.length > 0 && !ctx.house_ids.includes(parsed.data.houseId)) {
      return actionError("You do not have access to this house");
    }

    const ruleContext = buildShiftRuleContext(ctx.organization_id, parsed.data);
    const result = await evaluate(ruleContext);

    return actionSuccess({
      passed: result.passed,
      blocks: result.blocks.map((r) => ({ id: r.id, message: r.message })),
      confirms: result.confirms.map((r) => ({ id: r.id, message: r.message })),
      informs: result.informs.map((r) => ({ id: r.id, message: r.message })),
    });
  });
}

export async function updateShift(formData: FormData) {
  return withPermission(PermissionKey.ROSTER_EDIT, async (ctx) => {
    const parsed = updateShiftSchema.safeParse({
      shiftId: formData.get("shiftId"),
      houseId: formData.get("houseId") || undefined,
      participantId:
        formData.has("participantId") ? formData.get("participantId") || null : undefined,
      workerId:
        formData.has("workerId") ? formData.get("workerId") || null : undefined,
      startAt: formData.get("startAt") || undefined,
      endAt: formData.get("endAt") || undefined,
      shiftType: formData.get("shiftType") || undefined,
      ratio: formData.get("ratio") || undefined,
      notes: formData.has("notes") ? formData.get("notes") || "" : undefined,
      overrideReason: formData.get("overrideReason") || undefined,
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath("/roster");
      return actionSuccess(undefined, "Demo mode: shift updated.");
    }

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", parsed.data.shiftId)
      .eq("organization_id", ctx.organization_id)
      .is("deleted_at", null)
      .single<ShiftRow>();

    if (fetchError || !existing) {
      return actionError("Shift not found");
    }

    const nextHouseId = parsed.data.houseId ?? existing.house_id;
    if (ctx.house_ids.length > 0 && !ctx.house_ids.includes(nextHouseId)) {
      return actionError("You do not have access to this house");
    }

    const ruleInput = {
      houseId: nextHouseId,
      participantId:
        parsed.data.participantId !== undefined
          ? parsed.data.participantId
          : existing.participant_id,
      workerId:
        parsed.data.workerId !== undefined
          ? parsed.data.workerId
          : existing.worker_id,
      startAt: parsed.data.startAt ?? existing.start_at,
      endAt: parsed.data.endAt ?? existing.end_at,
      shiftType: parsed.data.shiftType ?? existing.shift_type,
      ratio: parsed.data.ratio ?? existing.ratio,
    };

    const execute = async () => {
      const patch: Database["public"]["Tables"]["shifts"]["Update"] = {
        house_id: nextHouseId,
        participant_id: ruleInput.participantId ?? null,
        worker_id: ruleInput.workerId ?? null,
        start_at: ruleInput.startAt,
        end_at: ruleInput.endAt,
        shift_type: ruleInput.shiftType,
        ratio: ruleInput.ratio,
        status: ruleInput.workerId ? "confirmed" : "unfilled",
        updated_by: ctx.user_id,
      };

      if (parsed.data.notes !== undefined) {
        patch.notes = parsed.data.notes || null;
      }

      const { error } = await supabase
        .from("shifts")
        .update(patch)
        .eq("id", parsed.data.shiftId)
        .eq("organization_id", ctx.organization_id);

      if (error) throw new Error(error.message);
    };

    try {
      await attemptActionWithRules(
        buildShiftRuleContext(ctx.organization_id, ruleInput),
        execute,
        {
          user_id: ctx.user_id,
          override_reason: parsed.data.overrideReason,
        }
      );

      revalidatePath("/roster");
      return actionSuccess(undefined, "Shift updated");
    } catch (e) {
      if (e instanceof RulesBlockedError) {
        return actionError(e.result.blocks.map((r) => r.message).join(" "));
      }
      if (e instanceof RequiresConfirmationError) {
        return actionError("CONFIRMATION_REQUIRED", {
          _form: e.result.confirms.map((r) => r.message),
        });
      }
      throw e;
    }
  });
}

export async function updateShiftTimes(formData: FormData) {
  return withPermission(
    PermissionKey.ROSTER_EDIT,
    async (ctx) => {
      const parsed = updateShiftTimesSchema.safeParse({
        shiftId: formData.get("shiftId"),
        startAt: formData.get("startAt"),
        endAt: formData.get("endAt"),
        overrideReason: formData.get("overrideReason") || undefined,
      });

      if (!parsed.success) {
        return actionError("Invalid input", zodFieldErrors(parsed.error));
      }

      if (!isSupabaseConfigured()) {
        revalidatePath("/roster");
        return actionSuccess(undefined, "Demo mode: shift updated.");
      }

      const supabase = await createClient();
      const { data: existing, error: fetchError } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", parsed.data.shiftId)
        .eq("organization_id", ctx.organization_id)
        .is("deleted_at", null)
        .single<ShiftRow>();

      if (fetchError || !existing) {
        return actionError("Shift not found");
      }

      if (ctx.house_ids.length > 0 && !ctx.house_ids.includes(existing.house_id)) {
        return actionError("You do not have access to this house");
      }

      const ruleContext = buildShiftRuleContext(ctx.organization_id, {
        houseId: existing.house_id,
        participantId: existing.participant_id,
        workerId: existing.worker_id,
        startAt: parsed.data.startAt,
        endAt: parsed.data.endAt,
        shiftType: existing.shift_type,
        ratio: existing.ratio,
      });

      const execute = async () => {
        const { error } = await supabase
          .from("shifts")
          .update({
            start_at: parsed.data.startAt,
            end_at: parsed.data.endAt,
            updated_by: ctx.user_id,
          })
          .eq("id", parsed.data.shiftId)
          .eq("organization_id", ctx.organization_id);

        if (error) throw new Error(error.message);
      };

      try {
        await attemptActionWithRules(ruleContext, execute, {
          user_id: ctx.user_id,
          override_reason: parsed.data.overrideReason,
        });

        revalidatePath("/roster");
        return actionSuccess(undefined, "Shift updated");
      } catch (e) {
        if (e instanceof RulesBlockedError) {
          return actionError(e.result.blocks.map((r) => r.message).join(" "));
        }
        if (e instanceof RequiresConfirmationError) {
          return actionError("CONFIRMATION_REQUIRED", {
            _form: e.result.confirms.map((r) => r.message),
          });
        }
        throw e;
      }
    }
  );
}

export async function cancelShift(formData: FormData) {
  return withPermission(PermissionKey.ROSTER_EDIT, async (ctx) => {
    const parsed = cancelShiftSchema.safeParse({
      shiftId: formData.get("shiftId"),
      reason: formData.get("reason") || undefined,
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath("/roster");
      return actionSuccess(undefined, "Demo mode: shift cancelled.");
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("shifts")
      .select("notes")
      .eq("id", parsed.data.shiftId)
      .eq("organization_id", ctx.organization_id)
      .single<{ notes: string | null }>();

    const cancelNote = parsed.data.reason
      ? [
          existing?.notes?.trim(),
          `Cancelled: ${parsed.data.reason}`,
        ].filter(Boolean).join("\n\n")
      : existing?.notes ?? null;

    const { error } = await supabase
      .from("shifts")
      .update({
        status: "cancelled",
        notes: cancelNote,
        updated_by: ctx.user_id,
      })
      .eq("id", parsed.data.shiftId)
      .eq("organization_id", ctx.organization_id);

    if (error) return actionError(error.message);

    revalidatePath("/roster");
    return actionSuccess(undefined, "Shift cancelled");
  });
}

export async function submitAvailability(formData: FormData) {
  return withPermission(PermissionKey.AVAILABILITY_SUBMIT, async (ctx) => {
    if (ctx.role !== "support_worker") {
      return actionError(
        "Only support workers can submit availability. Managers review worker availability on the roster."
      );
    }

    const cellsJson = formData.get("cells");
    let cells: unknown = [];
    try {
      cells = cellsJson ? JSON.parse(String(cellsJson)) : [];
    } catch {
      return actionError("Invalid availability data");
    }

    const parsed = submitAvailabilitySchema.safeParse({ cells });
    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath("/my-availability");
      return actionSuccess(undefined, "Demo mode: availability submitted.");
    }

    const supabase = createServiceClient();
    const rows = parsed.data.cells.map((cell) => ({
      organization_id: ctx.organization_id,
      worker_id: ctx.user_id,
      date: cell.date,
      start_time: cell.startTime ?? null,
      end_time: cell.endTime ?? null,
      status: cell.status,
      notes: cell.notes ?? null,
      submitted_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("worker_availability").upsert(rows, {
      onConflict: "worker_id,date,start_time,end_time",
    });

    if (error) return actionError(error.message);

    revalidatePath("/my-availability");
    revalidatePath("/roster");
    return actionSuccess(undefined, "Availability submitted");
  });
}

export async function requestShiftSwap(formData: FormData) {
  return withPermission(PermissionKey.SHIFT_SWAP_REQUEST, async (ctx) => {
    const parsed = shiftSwapRequestSchema.safeParse({
      shiftId: formData.get("shiftId"),
      targetWorkerId: formData.get("targetWorkerId") || undefined,
      reason: formData.get("reason"),
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath("/roster");
      return actionSuccess(undefined, "Demo mode: swap request submitted.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("shift_swap_requests").insert({
      organization_id: ctx.organization_id,
      shift_id: parsed.data.shiftId,
      requesting_worker_id: ctx.user_id,
      target_worker_id: parsed.data.targetWorkerId ?? null,
      reason: parsed.data.reason,
      status: "pending",
    });

    if (error) return actionError(error.message);

    await supabase
      .from("shifts")
      .update({ status: "swap_pending", updated_by: ctx.user_id })
      .eq("id", parsed.data.shiftId);

    revalidatePath("/roster");
    return actionSuccess(undefined, "Swap request submitted");
  });
}
