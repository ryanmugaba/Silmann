"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logPRNAdministration } from "@/app/(app)/participants/actions";
import type { ParticipantMedicationRow } from "@/types/database";

type PrnAdminDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  participantName: string;
  medication: ParticipantMedicationRow;
};

export function PrnAdminDialog({
  open,
  onOpenChange,
  participantId,
  participantName,
  medication,
}: PrnAdminDialogProps) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const administeredAt = form.get("administered_at") as string;
    const dose = form.get("dose_given") as string;
    const reason = form.get("reason") as string;
    const followUp = form.get("effect_30min_followup") as string;
    const notes = form.get("notes") as string;

    startTransition(async () => {
      const result = await logPRNAdministration({
        participant_id: participantId,
        medication_id: medication.id,
        administered_at: new Date(administeredAt).toISOString(),
        dose_given: dose,
        reason,
        effect_30min_followup: followUp || undefined,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success(result.message ?? "Administration logged");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const nowLocal = new Date();
  nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
  const defaultTime = nowLocal.toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-heading">
            Log PRN administration
          </DialogTitle>
          <DialogDescription>
            {medication.drug_name} for {participantName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="administered_at">Time administered</Label>
            <Input
              id="administered_at"
              name="administered_at"
              type="datetime-local"
              defaultValue={defaultTime}
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dose_given">Dose given</Label>
            <Input
              id="dose_given"
              name="dose_given"
              placeholder="e.g. 2 tablets"
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="Why was this medication given?"
              required
              className="rounded-lg"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effect_30min_followup">
              30-minute follow-up effect <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="effect_30min_followup"
              name="effect_30min_followup"
              placeholder="Effect observed after 30 minutes"
              className="rounded-lg"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              className="rounded-lg"
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving…" : "Log administration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
