"use client";

import { useState, useTransition } from "react";
import { Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addParticipantRule,
  removeParticipantRule,
} from "@/app/(app)/participants/actions";
import type { Rule } from "@/lib/primitives/rules/types";
import type { ProfileRow } from "@/types/database";
import { ParticipantEmptyState } from "./empty-state";

const RULE_TYPE_OPTIONS = [
  { value: "no_vehicle", label: "No vehicle access" },
  { value: "gender_restriction", label: "Gender preference" },
  { value: "restricted_pairing", label: "Restricted worker pairing" },
  { value: "language_required", label: "Language required" },
] as const;

type RuleBuilderProps = {
  participantId: string;
  houseId: string;
  rules: Rule[];
  workers: Pick<ProfileRow, "id" | "full_name">[];
  canEdit: boolean;
};

export function RuleBuilder({
  participantId,
  houseId,
  rules,
  workers,
  canEdit,
}: RuleBuilderProps) {
  const [open, setOpen] = useState(false);
  const [ruleType, setRuleType] = useState<string>("no_vehicle");
  const [workerId, setWorkerId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function handleRemove(ruleId: string) {
    startTransition(async () => {
      const result = await removeParticipantRule({
        rule_id: ruleId,
        participant_id: participantId,
      });
      if (result.success) {
        toast.success(result.message ?? "Rule removed");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addParticipantRule({
        participant_id: participantId,
        house_id: houseId,
        rule_type: ruleType as "no_vehicle" | "gender_restriction" | "restricted_pairing" | "language_required",
        not_gender: (form.get("not_gender") as string) || undefined,
        worker_id: workerId || undefined,
        language: (form.get("language") as string) || undefined,
        message: (form.get("message") as string) || undefined,
      });

      if (result.success) {
        toast.success(result.message ?? "Rule added");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!canEdit && rules.length === 0) {
    return (
      <ParticipantEmptyState
        icon={Shield}
        title="No rules configured"
        description="Rostering rules for this participant will appear here once added by a manager."
      />
    );
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl" size="sm">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Add rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-display tracking-heading">
                Add participant rule
              </DialogTitle>
              <DialogDescription>
                Common rostering constraints for this participant.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Rule type</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ruleType === "gender_restriction" ? (
                <div className="space-y-2">
                  <Label htmlFor="not_gender">Exclude gender</Label>
                  <Input
                    id="not_gender"
                    name="not_gender"
                    placeholder="e.g. male"
                    className="rounded-lg"
                    required
                  />
                </div>
              ) : null}

              {ruleType === "restricted_pairing" ? (
                <div className="space-y-2">
                  <Label>Restricted worker</Label>
                  <Select value={workerId} onValueChange={setWorkerId} required>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.full_name ?? w.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {ruleType === "language_required" ? (
                <div className="space-y-2">
                  <Label htmlFor="language">Required language</Label>
                  <Input
                    id="language"
                    name="language"
                    placeholder="e.g. Mandarin"
                    className="rounded-lg"
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="message">Custom message (optional)</Label>
                <Input
                  id="message"
                  name="message"
                  className="rounded-lg"
                  placeholder="Override default rule message"
                />
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
                  {pending ? "Adding…" : "Add rule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {rules.length === 0 ? (
        <ParticipantEmptyState
          icon={Shield}
          title="No rules yet"
          description="Add rostering rules like vehicle restrictions, gender preferences, or restricted worker pairings."
        />
      ) : (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="rounded-2xl border bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium">{rule.message}</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      rule.severity === "block"
                        ? "destructive"
                        : rule.severity === "confirm"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {rule.severity}
                  </Badge>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={pending}
                      onClick={() => handleRemove(rule.id)}
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatConditionLabel(rule.condition.type)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatConditionLabel(type: string): string {
  return type.replace(/_/g, " ");
}
