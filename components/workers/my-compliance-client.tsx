"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ComplianceDocCard } from "@/components/workers/compliance-doc-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPLIANCE_DOC_TYPES, COMPLIANCE_DOC_LABELS } from "@/lib/types/workers";
import type { ComplianceDocType, ComplianceDocument } from "@/lib/types/workers";
import { submitComplianceDoc } from "@/app/(app)/workers/actions";
import { toast } from "sonner";

export function MyComplianceClient({
  documents,
  workerId,
  isMock,
}: {
  documents: ComplianceDocument[];
  workerId: string;
  isMock?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<ComplianceDocType>("other");
  const [expiryDate, setExpiryDate] = useState("");

  const handleSubmit = async () => {
    const fd = new FormData();
    fd.set("workerId", workerId);
    fd.set("docType", docType);
    fd.set("docName", COMPLIANCE_DOC_LABELS[docType]);
    fd.set("expiryDate", expiryDate);
    const result = await submitComplianceDoc(fd);
    if (result.success) {
      toast.success("Document submitted for manager approval");
      setOpen(false);
    } else toast.error(result.error);
  };

  return (
    <div className="space-y-4">
      {isMock ? (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Demo mode — submissions are simulated.
        </p>
      ) : null}

      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
        Submit new document
      </Button>

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 px-8 py-12 text-center text-sm text-muted-foreground">
          No compliance documents on file. Complete onboarding or submit a renewal.
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <ComplianceDocCard key={doc.id} document={doc} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit document renewal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select
                value={docType}
                onValueChange={(v) => setDocType(v as ComplianceDocType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {COMPLIANCE_DOC_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry date</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={() => void handleSubmit()}>
              Submit for approval
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
