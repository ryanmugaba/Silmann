"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkApproveCompliance } from "@/app/(app)/workers/actions";
import { ComplianceDocCard } from "@/components/workers/compliance-doc-card";
import { Button } from "@/components/ui/button";
import type { ComplianceDocument } from "@/lib/types/workers";

export function ComplianceApprovalClient({
  documents,
  workerName,
}: {
  documents: ComplianceDocument[];
  workerName: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const pendingDocs = documents.filter((d) => d.status === "pending_approval");

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkApprove = () => {
    const fd = new FormData();
    Array.from(selected).forEach((id) => fd.append("documentIds", id));
    startTransition(async () => {
      const result = await bulkApproveCompliance(fd);
      if (result.success) {
        toast.success(result.message ?? "Approved");
        setSelected(new Set());
      } else toast.error(result.error);
    });
  };

  if (pendingDocs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/30 px-8 py-12 text-center text-sm text-muted-foreground">
        No documents awaiting approval for {workerName}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 ? (
        <Button onClick={handleBulkApprove} disabled={pending}>
          Approve {selected.size} selected
        </Button>
      ) : null}

      <div className="space-y-4">
        {pendingDocs.map((doc) => (
          <ComplianceDocCard
            key={doc.id}
            document={doc}
            workerName={workerName}
            showActions
            selectable
            selected={selected.has(doc.id)}
            onSelectChange={(on) => toggle(doc.id, on)}
          />
        ))}
      </div>

      <div className="space-y-4 border-t pt-6">
        <h2 className="font-medium">All documents</h2>
        {documents
          .filter((d) => d.status !== "pending_approval")
          .map((doc) => (
            <ComplianceDocCard key={doc.id} document={doc} />
          ))}
      </div>
    </div>
  );
}
