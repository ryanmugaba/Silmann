import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { getWorkerById } from "@/lib/data/workers-queries";
import { WorkerDetailTabs } from "@/components/workers/worker-detail-tabs";
import { ComplianceApprovalClient } from "@/components/workers/compliance-approval-client";
import { Button } from "@/components/ui/button";

export default async function WorkerCompliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.COMPLIANCE_APPROVE)) {
    redirect("/dashboard");
  }

  const { worker } = await getWorkerById(id, ctx.organization_id);
  if (!worker) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-heading">
            Compliance — {worker.fullName}
          </h1>
          <p className="text-muted-foreground">
            Review and approve worker-submitted documents.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/workers/${id}`}>Back to profile</Link>
        </Button>
      </div>

      <WorkerDetailTabs workerId={id} />

      <ComplianceApprovalClient
        documents={worker.documents}
        workerName={worker.fullName}
      />
    </div>
  );
}
