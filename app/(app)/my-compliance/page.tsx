import Link from "next/link";
import { redirect } from "next/navigation";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { listWorkerComplianceForProfile } from "@/lib/data/workers-queries";
import { MyComplianceClient } from "@/components/workers/my-compliance-client";
import { Button } from "@/components/ui/button";

export default async function MyCompliancePage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.COMPLIANCE_VIEW)) {
    redirect("/dashboard");
  }

  const { documents, workerId } = await listWorkerComplianceForProfile(
    ctx.user_id,
    ctx.organization_id
  );

  if (!workerId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-heading">
            My compliance
          </h1>
          <p className="text-muted-foreground">
            Your worker record is not linked yet. A team leader must invite you as a
            support worker, or complete worker onboarding from the Workers section.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

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

      <MyComplianceClient documents={documents} workerId={workerId} />
    </div>
  );
}
