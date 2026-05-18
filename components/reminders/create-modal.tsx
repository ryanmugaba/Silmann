"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
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
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createReminder } from "@/app/(app)/reminders/actions";
import { toast } from "sonner";

const RECURRENCE_OPTIONS = [
  { label: "None", value: "" },
  { label: "Daily", value: "FREQ=DAILY" },
  { label: "Weekly", value: "FREQ=WEEKLY" },
  { label: "Monthly", value: "FREQ=MONTHLY" },
];

type CreateReminderModalProps = {
  users?: { id: string; full_name: string | null }[];
  houses?: { id: string; name: string }[];
};

export function CreateReminderModal({
  users = [],
  houses = [],
}: CreateReminderModalProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [houseId, setHouseId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dueAt) {
      toast.error("Due date is required");
      return;
    }

    setSubmitting(true);
    const result = await createReminder({
      title,
      description: description || undefined,
      dueAt: new Date(dueAt).toISOString(),
      recurrenceRule: recurrence || undefined,
      assignedTo: assignedTo || undefined,
      houseId: houseId || undefined,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Reminder created");
    setOpen(false);
    setTitle("");
    setDescription("");
    setDueAt("");
  }

  return (
    <Can permission={PermissionKey.REMINDER_EDIT}>
      <Button className="rounded-xl" type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
        New reminder
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Create reminder"
        className="max-w-md rounded-3xl"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-title">Title</Label>
              <Input
                id="reminder-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-desc">Description</Label>
              <Textarea
                id="reminder-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-due">Due</Label>
              <Input
                id="reminder-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.label} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {users.length > 0 ? (
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Yourself" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name ?? u.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {houses.length > 0 ? (
              <div className="space-y-2">
                <Label>House (optional)</Label>
                <Select value={houseId} onValueChange={setHouseId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="">None</SelectItem>
                    {houses.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create reminder"}
            </Button>
        </form>
      </ResponsiveDialog>
    </Can>
  );
}
