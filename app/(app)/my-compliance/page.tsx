import { redirect } from "next/navigation";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { listWorkerComplianceForProfile } from "@/lib/data/workers-queries";
import { MyComplianceClient } from "@/components/workers/my-compliance-client";

export default async function MyCompliancePage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.COMPLIANCE_VIEW)) {
    redirect("/dashboard");
  }

  const { documents, workerId, isMock } = await listWorkerComplianceForProfile(
    ctx.user_id,
    ctx.organization_id
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          My compliance
        </h1>
        <p className="text-muted-foreground">
          Your documents, renewal status, and submissions awaiting approval.
        </p>
      </div>

      <MyComplianceClient
        documents={documents}
        workerId={workerId ?? "w1"}
        isMock={isMock}
      />
    </div>
  );
}
