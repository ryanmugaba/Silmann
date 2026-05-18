"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { approveComplianceDoc } from "@/app/(app)/workers/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMPLIANCE_DOC_LABELS } from "@/lib/types/workers";
import type { PendingComplianceItem } from "@/lib/types/workers";

type PendingComplianceWidgetProps = {
  documents: PendingComplianceItem[];
  isMock?: boolean;
};

export function PendingComplianceWidget({
  documents,
  isMock,
}: PendingComplianceWidgetProps) {
  const [pending, startTransition] = useTransition();

  if (documents.length === 0) {
    return null;
  }

  const handleApprove = (documentId: string) => {
    const fd = new FormData();
    fd.set("documentId", documentId);
    startTransition(async () => {
      const result = await approveComplianceDoc(fd);
      if (result.success) {
        toast.success(result.message ?? "Approved");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card className="border-warning/30 bg-warning/5 shadow-card">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15">
          <ClipboardCheck className="h-5 w-5 text-warning" strokeWidth={1.5} />
        </div>
        <div className="flex-1 space-y-1">
          <CardTitle className="text-base">
            Pending compliance approvals
            <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-warning px-2 text-xs font-semibold text-warning-foreground">
              {documents.length}
            </span>
          </CardTitle>
          <CardDescription>
            One-click approve — documents workers submitted for review.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 rounded-xl">
          <Link href="/workers">View all workers</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isMock ? (
          <p className="mb-2 text-xs text-muted-foreground">Demo data</p>
        ) : null}
        <ul className="space-y-2">
          {documents.slice(0, 5).map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.workerName}</p>
                <p className="text-xs text-muted-foreground">
                  {COMPLIANCE_DOC_LABELS[doc.docType] ?? doc.docName}
                  {doc.expiryDate ? ` · expires ${doc.expiryDate}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" asChild className="rounded-xl">
                  <Link href={`/workers/${doc.workerId}/compliance`}>Review</Link>
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl"
                  disabled={pending}
                  onClick={() => handleApprove(doc.id)}
                >
                  <Check className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                  Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {documents.length > 5 ? (
          <p className="text-center text-xs text-muted-foreground">
            +{documents.length - 5} more pending —{" "}
            <Link href="/workers" className="text-primary underline-offset-4 hover:underline">
              open workers
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
