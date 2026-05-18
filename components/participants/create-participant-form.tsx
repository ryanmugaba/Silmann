"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createParticipant } from "@/app/(app)/participants/actions";
import type { CreateParticipantInput } from "@/lib/validators/participants";
import type { HouseRow } from "@/types/database";

const STEPS = [
  "Basic info",
  "House & plan",
  "Goals & preferences",
  "Mobility & access",
  "Contacts & GP",
] as const;

type CreateParticipantFormProps = {
  houses: Pick<HouseRow, "id" | "name">[];
};

export function CreateParticipantForm({ houses }: CreateParticipantFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Partial<CreateParticipantInput>>({
    secondary_languages: [],
    mobility_aids: [],
    communication_methods: [],
    goals: [],
    emergency_contacts: [{ name: "", relationship: "", phone: "", email: "" }],
    gp_details: {},
    has_vehicle_access: false,
    plan_budget_by_category: {},
    dietary: {},
    preferences: {},
  });

  function update<K extends keyof CreateParticipantInput>(
    key: K,
    value: CreateParticipantInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createParticipant(form);
      if (result.success && result.data?.id) {
        toast.success(result.message ?? "Participant created");
        router.push(`/participants/${result.data.id}`);
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="font-display text-xl tracking-heading">
            {STEPS[step]}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mt-4 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input
                value={form.full_name ?? ""}
                onChange={(e) => update("full_name", e.target.value)}
                className="rounded-lg"
              />
            </Field>
            <Field label="Preferred name">
              <Input
                value={form.preferred_name ?? ""}
                onChange={(e) => update("preferred_name", e.target.value)}
                className="rounded-lg"
              />
            </Field>
            <Field label="NDIS number" required>
              <Input
                value={form.ndis_number ?? ""}
                onChange={(e) => update("ndis_number", e.target.value)}
                className="rounded-lg"
              />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={form.date_of_birth ?? ""}
                onChange={(e) => update("date_of_birth", e.target.value)}
                className="rounded-lg"
              />
            </Field>
            <Field label="Gender">
              <Input
                value={form.gender ?? ""}
                onChange={(e) => update("gender", e.target.value)}
                className="rounded-lg"
              />
            </Field>
            <Field label="Primary language">
              <Input
                value={form.primary_language ?? ""}
                onChange={(e) => update("primary_language", e.target.value)}
                className="rounded-lg"
              />
            </Field>
            <Field label="Photo URL" className="sm:col-span-2">
              <Input
                value={form.photo_url ?? ""}
                onChange={(e) => update("photo_url", e.target.value)}
                placeholder="https://"
                className="rounded-lg"
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="House" required>
              <Select
                value={form.house_id ?? ""}
                onValueChange={(v) => update("house_id", v)}
              >
                <SelectTrigger className="rounded-lg">
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
            </Field>
            <Field label="Plan total budget ($)">
              <Input
                type="number"
                min={0}
                value={form.plan_total_budget ?? ""}
                onChange={(e) =>
                  update("plan_total_budget", Number(e.target.value) || undefined)
                }
                className="rounded-lg"
              />
            </Field>
            <Field label="Plan start">
              <Input
                type="date"
                value={form.plan_start_date ?? ""}
                onChange={(e) => update("plan_start_date", e.target.value)}
                className="rounded-lg"
              />
            </Field>
            <Field label="Plan end">
              <Input
                type="date"
                value={form.plan_end_date ?? ""}
                onChange={(e) => update("plan_end_date", e.target.value)}
                className="rounded-lg"
              />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <Field label="Goals (one per line: title | description)">
              <Textarea
                className="rounded-lg"
                rows={4}
                placeholder="Daily living skills | Build independence in meal prep"
                onChange={(e) => {
                  const goals = e.target.value
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => {
                      const [title, ...rest] = line.split("|");
                      return {
                        title: title.trim(),
                        description: rest.join("|").trim() || undefined,
                      };
                    });
                  update("goals", goals);
                }}
              />
            </Field>
            <Field label="Dietary notes">
              <Textarea
                className="rounded-lg"
                rows={2}
                onChange={(e) =>
                  update("dietary", { notes: e.target.value })
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="vehicle"
                checked={form.has_vehicle_access ?? false}
                onCheckedChange={(c) =>
                  update("has_vehicle_access", c === true)
                }
              />
              <Label htmlFor="vehicle">Has vehicle access</Label>
            </div>
            <Field label="Mobility aids (comma-separated)">
              <Input
                className="rounded-lg"
                onChange={(e) =>
                  update(
                    "mobility_aids",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            </Field>
            <Field label="Communication methods (comma-separated)">
              <Input
                className="rounded-lg"
                onChange={(e) =>
                  update(
                    "communication_methods",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emergency contact name" required>
              <Input
                value={form.emergency_contacts?.[0]?.name ?? ""}
                onChange={(e) =>
                  update("emergency_contacts", [
                    {
                      ...form.emergency_contacts![0],
                      name: e.target.value,
                    },
                  ])
                }
                className="rounded-lg"
              />
            </Field>
            <Field label="Relationship" required>
              <Input
                value={form.emergency_contacts?.[0]?.relationship ?? ""}
                onChange={(e) =>
                  update("emergency_contacts", [
                    {
                      ...form.emergency_contacts![0],
                      relationship: e.target.value,
                    },
                  ])
                }
                className="rounded-lg"
              />
            </Field>
            <Field label="Phone" required>
              <Input
                value={form.emergency_contacts?.[0]?.phone ?? ""}
                onChange={(e) =>
                  update("emergency_contacts", [
                    {
                      ...form.emergency_contacts![0],
                      phone: e.target.value,
                    },
                  ])
                }
                className="rounded-lg"
              />
            </Field>
            <Field label="GP name">
              <Input
                onChange={(e) =>
                  update("gp_details", {
                    ...form.gp_details,
                    name: e.target.value,
                  })
                }
                className="rounded-lg"
              />
            </Field>
          </div>
        ) : null}

        <div className="flex justify-between border-t pt-6">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={back}
            disabled={step === 0 || pending}
          >
            <ChevronLeft className="mr-1 h-4 w-4" strokeWidth={1.5} />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" className="rounded-xl" onClick={next}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-xl"
              onClick={handleSubmit}
              disabled={pending}
            >
              {pending ? "Creating…" : "Create participant"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-sm">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
