import { redirect } from "next/navigation";
import { endOfWeek, startOfWeek } from "date-fns";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import {
  getAvailabilityGrid,
  listShiftsInRange,
} from "@/lib/data/roster-queries";
import { RosterCalendarClient } from "@/components/roster/roster-calendar-client";
import { createClient } from "@/lib/supabase/server";

export default async function RosterPage({
  searchParams,
}: {
  searchParams?: { action?: string };
}) {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.ROSTER_VIEW)) {
    redirect("/dashboard");
  }

  const rangeStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [{ shifts, isMock: shiftsMock }, { cells, isMock: availMock }] =
    await Promise.all([
      listShiftsInRange(
        ctx.organization_id,
        rangeStart.toISOString(),
        rangeEnd.toISOString()
      ),
      getAvailabilityGrid(ctx.organization_id),
    ]);

  const supabase = await createClient();
  const { data: houseRows } = await supabase
    .from("houses")
    .select("id, name")
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .order("name");

  const houses =
    houseRows && houseRows.length > 0
      ? houseRows
      : [
          { id: "10000000-0000-4000-8000-000000000001", name: "Parramatta SIL" },
          { id: "10000000-0000-4000-8000-000000000002", name: "Blacktown SIL" },
        ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          Roster
        </h1>
        <p className="text-muted-foreground">
          Schedule shifts, manage availability, and fill gaps across your SIL
          houses.
        </p>
      </div>

      <RosterCalendarClient
        organizationId={ctx.organization_id}
        currentUserId={ctx.user_id}
        initialShifts={shifts}
        availabilityCells={cells}
        houses={houses}
        isMock={shiftsMock || availMock}
        initialCreateOpen={searchParams?.action === "create-shift"}
      />
    </div>
  );
}
