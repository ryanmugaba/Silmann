import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { listWorkers } from "@/lib/data/workers-queries";
import { WorkersListClient } from "@/components/workers/workers-list-client";
import { InviteWorkerDialog } from "@/components/workers/invite-worker-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { HouseRow } from "@/types/database";
import { Suspense } from "react";

export default async function WorkersPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.WORKER_VIEW)) {
    redirect("/dashboard");
  }

  const { workers } = await listWorkers(ctx.organization_id);

  const supabase = await createClient();
  const { data: houseRows } = await supabase
    .from("houses")
    .select("id, name")
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .order("name")
    .returns<Pick<HouseRow, "id" | "name">[]>();

  const houses = houseRows ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-heading">
            Workers
          </h1>
          <p className="text-muted-foreground">
            Support workers, compliance status, and house assignments.
          </p>
        </div>
        {can(ctx, PermissionKey.WORKER_CREATE) ? (
          <Button asChild>
            <Link href="/workers?invite=1">
              <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Invite worker
            </Link>
          </Button>
        ) : null}
      </div>

      {houses.length === 0 && can(ctx, PermissionKey.WORKER_CREATE) ? (
        <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Add a house under{" "}
          <Link href="/settings/houses" className="font-medium underline underline-offset-2">
            Settings → Houses
          </Link>{" "}
          before you can invite workers.
        </p>
      ) : null}

      {workers.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-muted/30 px-8 py-16 text-center shadow-card">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} />
          <h2 className="font-display text-lg font-semibold">No workers yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Invite support workers to your organisation. They&apos;ll complete
            onboarding and submit compliance documents for your approval.
          </p>
        </div>
      ) : (
        <WorkersListClient workers={workers} />
      )}

      {can(ctx, PermissionKey.WORKER_CREATE) ? (
        <Suspense fallback={null}>
          <InviteWorkerDialog houses={houses} />
        </Suspense>
      ) : null}
    </div>
  );
}
