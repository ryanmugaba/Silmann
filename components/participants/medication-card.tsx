"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { MoreHorizontal, Pill } from "lucide-react";
import { toast } from "sonner";
import { CountdownBadge } from "@/components/shared/countdown-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ceaseMedication } from "@/app/(app)/participants/actions";
import { computeCountdownStatus } from "@/lib/primitives/countdown/compute";
import { DEFAULT_MEDICATION } from "@/lib/primitives/countdown/types";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { formatDate } from "@/lib/utils";
import type { ParticipantMedicationRow } from "@/types/database";
import { PrnAdminDialog } from "./prn-admin-dialog";

type MedicationCardProps = {
  medication: ParticipantMedicationRow;
  participantId: string;
  participantName: string;
  houseId: string;
  canEdit: boolean;
};

export function MedicationCard({
  medication,
  participantId,
  participantName,
  houseId,
  canEdit,
}: MedicationCardProps) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const countdown =
    medication.expiry_date != null
      ? computeCountdownStatus(
          {
            expiry_date: medication.expiry_date,
            thresholds: DEFAULT_MEDICATION.thresholds,
            severity_per_threshold: DEFAULT_MEDICATION.severity_per_threshold,
            status: "active",
          },
          new Date()
        )
      : null;

  function handleCease() {
    startTransition(async () => {
      const result = await ceaseMedication({
        medication_id: medication.id,
        participant_id: participantId,
      });
      if (result.success) {
        toast.success(result.message ?? "Medication ceased");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <article className="rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
        <div className="flex items-start justify-between gap-4">
          <motion.div
            className="flex gap-4"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Pill className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </motion.div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{medication.drug_name}</h3>
                <Badge variant="outline" className="uppercase">
                  {medication.type === "prn" ? "PRN" : "Webster-pak"}
                </Badge>
                {medication.status === "ceased" ? (
                  <Badge variant="secondary">Ceased</Badge>
                ) : null}
              </div>
              {medication.strength || medication.form ? (
                <p className="text-sm text-muted-foreground">
                  {[medication.strength, medication.form].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {medication.indication ? (
                <p className="text-sm text-muted-foreground">{medication.indication}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                {medication.expiry_date ? (
                  <span>Expires {formatDate(medication.expiry_date)}</span>
                ) : null}
                {medication.max_dose_per_24h ? (
                  <span>Max {medication.max_dose_per_24h} / 24h</span>
                ) : null}
                {medication.min_interval_hours != null ? (
                  <span>Min interval {medication.min_interval_hours}h</span>
                ) : null}
              </div>
            </div>
          </motion.div>
          <div className="flex items-center gap-2">
            {countdown && medication.status === "active" ? (
              <CountdownBadge
                daysRemaining={countdown.days_remaining}
                severity={countdown.severity}
              />
            ) : null}
            {canEdit && medication.status === "active" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={pending}
                    onClick={handleCease}
                  >
                    Cease medication
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {medication.type === "prn" && medication.status === "active" ? (
          <div className="mt-4 flex gap-2 border-t pt-4">
            <Can
              permission={PermissionKey.MEDICATION_ADMINISTER}
              resource={{ house_id: houseId }}
            >
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => setAdminOpen(true)}
              >
                Administer
              </Button>
            </Can>
          </div>
        ) : null}
      </article>

      <PrnAdminDialog
        open={adminOpen}
        onOpenChange={setAdminOpen}
        participantId={participantId}
        participantName={participantName}
        medication={medication}
      />
    </>
  );
}
