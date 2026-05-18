import { listShiftsInRange, getAvailabilityGrid, getShiftById } from "@/lib/data/roster-queries";
import { createShift } from "@/app/(app)/roster/actions";
import type { PermissionContext } from "@/lib/primitives/rbac/types";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import type { RosteringToolName } from "@/lib/ai/rostering-tools";

export async function executeRosterTool(
  name: RosteringToolName,
  input: Record<string, unknown>,
  ctx: PermissionContext
): Promise<Record<string, unknown>> {
  switch (name) {
    case "create_shift": {
      if (!can(ctx, PermissionKey.ROSTER_CREATE, { house_id: String(input.house_id) })) {
        return { error: "Permission denied: roster:create" };
      }
      const fd = new FormData();
      fd.set("houseId", String(input.house_id));
      if (input.participant_id) fd.set("participantId", String(input.participant_id));
      if (input.worker_id) fd.set("workerId", String(input.worker_id));
      fd.set("startAt", String(input.start));
      fd.set("endAt", String(input.end));
      fd.set("shiftType", String(input.shift_type));
      if (input.ratio) fd.set("ratio", String(input.ratio));
      if (input.override_reason) fd.set("overrideReason", String(input.override_reason));
      const result = await createShift(fd);
      return { result };
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

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
