"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createIncident } from "@/app/(app)/incidents/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABELS,
  type IncidentSeverity,
  type IncidentType,
} from "@/types/incidents";

type Option = { id: string; name: string };

export function CreateIncidentDialog({
  houses,
  participants,
}: {
  houses: Option[];
  participants: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentType>("other");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [occurredAt, setOccurredAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [houseId, setHouseId] = useState<string>("");
  const [participantId, setParticipantId] = useState<string>("");
  const [immediateActions, setImmediateActions] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setIncidentType("other");
    setSeverity("medium");
    setImmediateActions("");
    setHouseId("");
    setParticipantId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const occurred = new Date(occurredAt);
    if (Number.isNaN(occurred.getTime())) {
      toast.error("Enter a valid date and time");
      return;
    }

    startTransition(async () => {
      const result = await createIncident({
        title,
        description,
        incident_type: incidentType,
        severity,
        occurred_at: occurred.toISOString(),
        house_id: houseId || null,
        participant_id: participantId || null,
        immediate_actions: immediateActions || undefined,
      });

      if (result.success) {
        toast.success(result.message ?? "Incident recorded");
        reset();
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Record incident
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display tracking-heading">
              Record incident
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inc-title">Title</Label>
              <Input
                id="inc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="rounded-lg"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={incidentType}
                  onValueChange={(v) => setIncidentType(v as IncidentType)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {INCIDENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={severity}
                  onValueChange={(v) => setSeverity(v as IncidentSeverity)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {INCIDENT_SEVERITY_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-when">When it occurred</Label>
              <Input
                id="inc-when"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
                className="rounded-lg"
              />
            </div>
            {houses.length > 0 ? (
              <div className="space-y-2">
                <Label>House (optional)</Label>
                <Select value={houseId || "_none"} onValueChange={(v) => setHouseId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select house" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not specified</SelectItem>
                    {houses.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {participants.length > 0 ? (
              <div className="space-y-2">
                <Label>Participant (optional)</Label>
                <Select
                  value={participantId || "_none"}
                  onValueChange={(v) =>
                    setParticipantId(v === "_none" ? "" : v)
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select participant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Not specified</SelectItem>
                    {participants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="inc-desc">What happened</Label>
              <Textarea
                id="inc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-actions">Immediate actions taken</Label>
              <Textarea
                id="inc-actions"
                value={immediateActions}
                onChange={(e) => setImmediateActions(e.target.value)}
                rows={2}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving…" : "Save to register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
