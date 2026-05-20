"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { closeIncident, updateIncident } from "@/app/(app)/incidents/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  type IncidentDetail,
  type IncidentStatus,
} from "@/types/incidents";

export function IncidentDetailClient({
  incident,
  canEdit,
  canClose,
}: {
  incident: IncidentDetail;
  canEdit: boolean;
  canClose: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(incident.status);
  const [followUp, setFollowUp] = useState(incident.follow_up_notes ?? "");
  const [closeNotes, setCloseNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const saveUpdate = () => {
    startTransition(async () => {
      const result = await updateIncident({
        incident_id: incident.id,
        status,
        follow_up_notes: followUp,
      });
      if (result.success) {
        toast.success(result.message ?? "Updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleClose = () => {
    if (!closeNotes.trim()) {
      toast.error("Add closing notes before closing the incident");
      return;
    }
    startTransition(async () => {
      const result = await closeIncident({
        incident_id: incident.id,
        follow_up_notes: closeNotes,
      });
      if (result.success) {
        toast.success(result.message ?? "Incident closed");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (incident.status === "closed") {
    return (
      <p className="text-sm text-muted-foreground">
        This incident is closed and locked for audit purposes.
      </p>
    );
  }

  if (!canEdit && !canClose) return null;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-card">
      <h3 className="font-medium">Follow-up</h3>
      {canEdit ? (
        <>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as IncidentStatus)}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_STATUSES.filter((s) => s !== "closed").map((s) => (
                  <SelectItem key={s} value={s}>
                    {INCIDENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="follow-up">Notes</Label>
            <Textarea
              id="follow-up"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              rows={3}
              className="rounded-lg"
            />
          </div>
          <Button
            className="rounded-xl"
            variant="outline"
            disabled={pending}
            onClick={saveUpdate}
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </>
      ) : null}
      {canClose ? (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="close-notes">Closing notes</Label>
          <Textarea
            id="close-notes"
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            rows={3}
            className="rounded-lg"
            placeholder="Summary of investigation and outcome"
          />
          <Button
            className="rounded-xl"
            variant="destructive"
            disabled={pending}
            onClick={handleClose}
          >
            {pending ? "Closing…" : "Close incident"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
