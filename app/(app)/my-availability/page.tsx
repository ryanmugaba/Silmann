import { redirect } from "next/navigation";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { getWorkerAvailability } from "@/lib/data/roster-queries";
import { MyAvailabilityClient } from "@/components/roster/my-availability-client";

export default async function MyAvailabilityPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.AVAILABILITY_VIEW_OWN)) {
    redirect("/dashboard");
  }

  const { cells, lockedDates, isMock } = await getWorkerAvailability(
    ctx.user_id,
    ctx.organization_id
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          My availability
        </h1>
        <p className="text-muted-foreground">
          Submit your availability for the next four weeks. Tap a day to cycle
          status, then submit to lock in.
        </p>
      </div>

      <MyAvailabilityClient
        initialCells={cells}
        lockedDates={lockedDates}
        isMock={isMock}
      />
    </div>
  );
}
