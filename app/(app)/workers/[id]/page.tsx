import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { getWorkerById } from "@/lib/data/workers-queries";
import { WorkerDetailTabs } from "@/components/workers/worker-detail-tabs";
import { ComplianceDocCard } from "@/components/workers/compliance-doc-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.WORKER_VIEW)) {
    redirect("/dashboard");
  }

  const { worker, isMock } = await getWorkerById(id, ctx.organization_id);
  if (!worker) notFound();

  const pendingDocs = worker.documents.filter(
    (d) => d.status === "pending_approval"
  );
  const initials = worker.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/workers">
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Workers
        </Link>
      </Button>

      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-start gap-6 p-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={worker.avatarUrl ?? undefined} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-heading">
              {worker.fullName}
            </h1>
            <p className="text-muted-foreground">{worker.email}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>{worker.employmentType?.replace("_", " ") ?? "—"}</Badge>
              <Badge variant="outline">SCHADS {worker.schadsLevel ?? "—"}</Badge>
              <Badge variant="secondary" className="capitalize">
                {worker.status}
              </Badge>
            </div>
          </div>
          {pendingDocs.length > 0 && can(ctx, PermissionKey.COMPLIANCE_APPROVE) ? (
            <Button asChild>
              <Link href={`/workers/${id}/compliance`}>
                {pendingDocs.length} pending approval
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {isMock ? (
        <p className="text-sm text-muted-foreground">Demo data mode</p>
      ) : null}

      <WorkerDetailTabs workerId={id} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Phone:</span>{" "}
              {worker.phone ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Houses:</span>{" "}
              {worker.houseNames.join(", ") || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Languages:</span>{" "}
              {worker.languages.join(", ") || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Compliance documents</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/workers/${id}/compliance`}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {worker.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents yet.</p>
            ) : (
              worker.documents.slice(0, 3).map((doc) => (
                <ComplianceDocCard key={doc.id} document={doc} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
