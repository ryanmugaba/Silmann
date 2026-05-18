import { redirect } from "next/navigation";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { WorkerOnboardingWizard } from "@/components/workers/worker-onboarding-wizard";
import { listWorkerComplianceForProfile } from "@/lib/data/workers-queries";

export default async function OnboardingWorkerPage() {
  const ctx = await getPermissionContext();

  if (ctx.role !== "support_worker") {
    redirect("/dashboard");
  }

  const { workerId } = await listWorkerComplianceForProfile(
    ctx.user_id,
    ctx.organization_id
  );

  return (
    <div className="mx-auto max-w-xl">
      <WorkerOnboardingWizard
        profileId={ctx.user_id}
        workerId={workerId ?? "w-demo"}
      />
    </div>
  );
}
