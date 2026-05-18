"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addMedication } from "@/app/(app)/participants/actions";

type AddMedicationFormProps = {
  participantId: string;
  participantName: string;
};

export function AddMedicationForm({
  participantId,
  participantName,
}: AddMedicationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addMedication({
        participant_id: participantId,
        drug_name: form.get("drug_name") as string,
        strength: (form.get("strength") as string) || undefined,
        form: (form.get("form") as string) || undefined,
        prescriber: (form.get("prescriber") as string) || undefined,
        script_date: (form.get("script_date") as string) || undefined,
        expiry_date: (form.get("expiry_date") as string) || undefined,
        indication: (form.get("indication") as string) || undefined,
        max_dose_per_24h: (form.get("max_dose_per_24h") as string) || undefined,
        min_interval_hours: form.get("min_interval_hours")
          ? Number(form.get("min_interval_hours"))
          : undefined,
        type: "prn",
      });

      if (result.success) {
        toast.success(result.message ?? "Medication added");
        router.push(`/participants/${participantId}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="mx-auto max-w-2xl shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-heading">
          Add PRN medication
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          For {participantName}. Expiry will register with the Countdown Engine.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="drug_name">Drug name</Label>
              <Input
                id="drug_name"
                name="drug_name"
                required
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strength">Strength</Label>
              <Input id="strength" name="strength" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med_form">Form</Label>
              <Input id="med_form" name="form" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prescriber">Prescriber</Label>
              <Input id="prescriber" name="prescriber" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script_date">Script date</Label>
              <Input
                id="script_date"
                name="script_date"
                type="date"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry date</Label>
              <Input
                id="expiry_date"
                name="expiry_date"
                type="date"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="indication">Indication</Label>
              <Textarea
                id="indication"
                name="indication"
                className="rounded-lg"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_dose_per_24h">Max dose / 24h</Label>
              <Input
                id="max_dose_per_24h"
                name="max_dose_per_24h"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_interval_hours">Min interval (hours)</Label>
              <Input
                id="min_interval_hours"
                name="min_interval_hours"
                type="number"
                step="0.5"
                min={0}
                className="rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              asChild
            >
              <Link href={`/participants/${participantId}`}>Cancel</Link>
            </Button>
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving…" : "Save medication"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
