"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  createShift,
  evaluateShiftRules,
  getRosterFormOptions,
} from "@/app/(app)/roster/actions";
import { RuleConfirmationModal } from "@/components/shared/rule-confirmation-modal";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Rule } from "@/lib/primitives/rules/types";
import { SHIFT_TYPES, SHIFT_TYPE_LABELS, type ShiftType } from "@/lib/types/roster";

export type ShiftCreateDefaults = {
  houseId?: string;
  workerId?: string;
  participantId?: string;
  startAt?: Date;
  endAt?: Date;
  shiftType?: ShiftType;
};

type HouseOption = { id: string; name: string };

export type ShiftCreateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houses: HouseOption[];
  defaults?: ShiftCreateDefaults;
  onCreated?: () => void;
};

export function ShiftCreateModal({
  open,
  onOpenChange,
  houses,
  defaults,
  onCreated,
}: ShiftCreateModalProps) {
  const [houseId, setHouseId] = useState(defaults?.houseId ?? houses[0]?.id ?? "");
  const [participantId, setParticipantId] = useState(defaults?.participantId ?? "");
  const [workerId, setWorkerId] = useState(defaults?.workerId ?? "");
  const [workers, setWorkers] = useState<Array<{ id: string; name: string }>>([]);
  const [participants, setParticipants] = useState<Array<{ id: string; name: string }>>([]);
  const [shiftType, setShiftType] = useState<ShiftType>(defaults?.shiftType ?? "day");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmRules, setConfirmRules] = useState<Rule[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockMessages, setBlockMessages] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const start = defaults?.startAt ?? new Date();
    const end =
      defaults?.endAt ??
      new Date(start.getTime() + 8 * 60 * 60 * 1000);
    setHouseId(defaults?.houseId ?? houses[0]?.id ?? "");
    setParticipantId(defaults?.participantId ?? "");
    setWorkerId(defaults?.workerId ?? "");
    setShiftType(defaults?.shiftType ?? "day");
    setStartAt(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEndAt(format(end, "yyyy-MM-dd'T'HH:mm"));
    setBlockMessages([]);
    setConfirmRules([]);
  }, [open, defaults, houses]);

  useEffect(() => {
    if (!open || !houseId) return;
    void getRosterFormOptions(houseId).then((result) => {
      if (result.success && result.data) {
        setWorkers(result.data.workers);
        setParticipants(result.data.participants);
      }
    });
  }, [open, houseId]);

  const submitWithReason = (overrideReason?: string) => {
    const fd = new FormData();
    fd.set("houseId", houseId);
    if (participantId) fd.set("participantId", participantId);
    if (workerId) fd.set("workerId", workerId);
    fd.set("startAt", new Date(startAt).toISOString());
    fd.set("endAt", new Date(endAt).toISOString());
    fd.set("shiftType", shiftType);
    fd.set("notes", notes);
    if (overrideReason) fd.set("overrideReason", overrideReason);

    startTransition(async () => {
      const result = await createShift(fd);
      if (result.success) {
        toast.success(result.message ?? "Shift created");
        onOpenChange(false);
        onCreated?.();
        return;
      }
      if (result.error === "CONFIRMATION_REQUIRED" && result.fieldErrors?._form) {
        setConfirmRules(
          result.fieldErrors._form.map((message, i) => ({
            id: `confirm-${i}`,
            organization_id: "",
            entity_type: "house",
            entity_id: houseId,
            condition: { type: "min_notice_hours", hours: 0 },
            severity: "confirm",
            message,
            requires_reason: true,
            is_active: true,
            created_at: "",
            updated_at: "",
          }))
        );
        setConfirmOpen(true);
        return;
      }
      toast.error(result.error);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBlockMessages([]);

    const evalFd = new FormData();
    evalFd.set("houseId", houseId);
    if (participantId) evalFd.set("participantId", participantId);
    if (workerId) evalFd.set("workerId", workerId);
    evalFd.set("startAt", new Date(startAt).toISOString());
    evalFd.set("endAt", new Date(endAt).toISOString());
    evalFd.set("shiftType", shiftType);

    startTransition(async () => {
      const evalResult = await evaluateShiftRules(evalFd);
      if (!evalResult.success || !evalResult.data) {
        submitWithReason();
        return;
      }

      const { blocks, confirms, informs } = evalResult.data;
      if (blocks.length > 0) {
        setBlockMessages(blocks.map((b) => b.message));
        return;
      }
      for (const msg of informs.map((i) => i.message)) {
        toast.warning(msg);
      }
      if (confirms.length > 0) {
        setConfirmRules(
          confirms.map((c, i) => ({
            id: c.id ?? `confirm-${i}`,
            organization_id: "",
            entity_type: "house",
            entity_id: houseId,
            condition: { type: "min_notice_hours", hours: 0 },
            severity: "confirm",
            message: c.message,
            requires_reason: true,
            is_active: true,
            created_at: "",
            updated_at: "",
          }))
        );
        setConfirmOpen(true);
        return;
      }
      submitWithReason();
    });
  };

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Create shift"
        className="max-w-lg"
      >
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Shifts are evaluated against care and rostering rules before saving.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>House</Label>
              <Select value={houseId} onValueChange={setHouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select house" />
                </SelectTrigger>
                <SelectContent>
                  {houses.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startAt">Start</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">End</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Shift type</Label>
              <Select
                value={shiftType}
                onValueChange={(v) => setShiftType(v as ShiftType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SHIFT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Participant (optional)</Label>
              <Select
                value={participantId || "__none__"}
                onValueChange={(v) => setParticipantId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Worker (optional)</Label>
              <Select
                value={workerId || "__none__"}
                onValueChange={(v) => setWorkerId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unfilled shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unfilled</SelectItem>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {blockMessages.length > 0 ? (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                <p className="font-medium">Cannot create shift</p>
                <ul className="mt-2 list-disc pl-4">
                  {blockMessages.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create shift"}
              </Button>
            </div>
        </form>
      </ResponsiveDialog>

      <RuleConfirmationModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        confirmRules={confirmRules}
        isSubmitting={pending}
        onConfirm={async (reason) => {
          setConfirmOpen(false);
          submitWithReason(reason);
        }}
      />
    </>
  );
}
