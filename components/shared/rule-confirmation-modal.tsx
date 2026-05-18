"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Rule } from "@/lib/primitives/rules/types";

export interface RuleConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmRules: Rule[];
  onConfirm: (overrideReason: string) => void | Promise<void>;
  onCancel?: () => void;
  title?: string;
  isSubmitting?: boolean;
}

export function RuleConfirmationModal({
  open,
  onOpenChange,
  confirmRules,
  onConfirm,
  onCancel,
  title = "Confirmation required",
  isSubmitting = false,
}: RuleConfirmationModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please provide a reason to proceed.");
      return;
    }
    setError(null);
    await onConfirm(trimmed);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    setError(null);
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={1.5} />
            {title}
          </DialogTitle>
          <DialogDescription>
            The following care or rostering rules apply. Provide a reason to
            continue — this will be recorded for NDIS audit purposes.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 rounded-2xl bg-muted/50 p-4">
          {confirmRules.map((rule) => (
            <li key={rule.id} className="text-sm text-foreground">
              {rule.message}
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <Label htmlFor="override-reason">Override reason</Label>
          <Textarea
            id="override-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this action is appropriate despite the rule…"
            disabled={isSubmitting}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Confirming…" : "Confirm and proceed"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


