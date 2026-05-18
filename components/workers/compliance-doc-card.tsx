"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Check, ExternalLink, FileText, X } from "lucide-react";
import { toast } from "sonner";
import {
  approveComplianceDoc,
  rejectComplianceDoc,
} from "@/app/(app)/workers/actions";
import { CountdownBadge } from "@/components/shared/countdown-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeCountdownStatus } from "@/lib/primitives/countdown/compute";
import { DEFAULT_COMPLIANCE_DOC } from "@/lib/primitives/countdown/types";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import {
  COMPLIANCE_DOC_LABELS,
  type ComplianceDocument,
} from "@/lib/types/workers";

const STATUS_VARIANT: Record<
  ComplianceDocument["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending_approval: "secondary",
  approved: "default",
  rejected: "destructive",
  expired: "destructive",
};

export type ComplianceDocCardProps = {
  document: ComplianceDocument;
  workerName?: string;
  showActions?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
};

export function ComplianceDocCard({
  document: doc,
  workerName,
  showActions = false,
  selectable = false,
  selected = false,
  onSelectChange,
}: ComplianceDocCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  const countdown =
    doc.expiryDate && doc.status === "approved"
      ? computeCountdownStatus({
          expiry_date: doc.expiryDate,
          thresholds: DEFAULT_COMPLIANCE_DOC.thresholds,
          severity_per_threshold: DEFAULT_COMPLIANCE_DOC.severity_per_threshold,
          status: "active",
        })
      : null;

  const handleApprove = () => {
    const fd = new FormData();
    fd.set("documentId", doc.id);
    startTransition(async () => {
      const result = await approveComplianceDoc(fd);
      if (result.success) toast.success(result.message ?? "Approved");
      else toast.error(result.error);
    });
  };

  const handleReject = () => {
    const fd = new FormData();
    fd.set("documentId", doc.id);
    fd.set("rejectedReason", rejectReason);
    startTransition(async () => {
      const result = await rejectComplianceDoc(fd);
      if (result.success) {
        toast.success("Document rejected");
        setRejectOpen(false);
        setRejectReason("");
      } else toast.error(result.error);
    });
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-start gap-3">
          {selectable ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectChange?.(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input"
              aria-label="Select document"
            />
          ) : null}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="text-base">
              {COMPLIANCE_DOC_LABELS[doc.docType] ?? doc.docName}
            </CardTitle>
            {workerName ? (
              <p className="text-sm text-muted-foreground">{workerName}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[doc.status]}>
            {doc.status.replace("_", " ")}
          </Badge>
          {countdown ? (
            <CountdownBadge
              daysRemaining={countdown.days_remaining}
              severity={countdown.severity}
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {doc.expiryDate ? (
          <p className="text-muted-foreground">
            Expires{" "}
            <span className="font-medium text-foreground">
              {format(parseISO(doc.expiryDate), "d MMM yyyy")}
            </span>
          </p>
        ) : null}
        {doc.issuingBody ? (
          <p className="text-muted-foreground">Issued by {doc.issuingBody}</p>
        ) : null}
        {doc.rejectedReason ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-danger">
            {doc.rejectedReason}
          </p>
        ) : null}
        {doc.fileUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" strokeWidth={1.5} />
              View file
            </a>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">No file attached (demo)</p>
        )}

        {showActions && doc.status === "pending_approval" ? (
          <Can permission={PermissionKey.COMPLIANCE_APPROVE}>
            <div className="flex flex-wrap gap-2 pt-2">
              {!rejectOpen ? (
                <>
                  <Button size="sm" onClick={handleApprove} disabled={pending}>
                    <Check className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectOpen(true)}
                    disabled={pending}
                  >
                    <X className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                    Reject
                  </Button>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <Label htmlFor={`reject-${doc.id}`}>Rejection reason</Label>
                  <Input
                    id={`reject-${doc.id}`}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain what needs to be corrected…"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleReject}
                      disabled={pending || rejectReason.length < 3}
                    >
                      Confirm reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRejectOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Can>
        ) : null}
      </CardContent>
    </Card>
  );
}
