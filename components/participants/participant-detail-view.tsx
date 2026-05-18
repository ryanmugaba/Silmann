"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Activity, FolderOpen, Pill, Target } from "lucide-react";
import { toast } from "sonner";
import { CountdownBadge } from "@/components/shared/countdown-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateParticipant } from "@/app/(app)/participants/actions";
import { computeCountdownStatus } from "@/lib/primitives/countdown/compute";
import { DEFAULT_PLAN_DATES } from "@/lib/primitives/countdown/types";
import type { Rule } from "@/lib/primitives/rules/types";
import { formatDate } from "@/lib/utils";
import type {
  AuditLogRow,
  ParticipantMedicationRow,
  ParticipantRow,
  ProfileRow,
} from "@/types/database";
import { MedicationCard } from "./medication-card";
import { ParticipantEmptyState } from "./empty-state";
import { RuleBuilder } from "./rule-builder";

type ParticipantDetailViewProps = {
  participant: ParticipantRow & { house_name: string };
  medications: ParticipantMedicationRow[];
  rules: Rule[];
  workers: Pick<ProfileRow, "id" | "full_name">[];
  auditLogs: AuditLogRow[];
  canEdit: boolean;
  canViewMedications: boolean;
  canViewAudit: boolean;
};

export function ParticipantDetailView({
  participant,
  medications,
  rules,
  workers,
  auditLogs,
  canEdit,
  canViewMedications,
  canViewAudit,
}: ParticipantDetailViewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const planCountdown = participant.plan_end_date
    ? computeCountdownStatus(
        {
          expiry_date: participant.plan_end_date,
          thresholds: DEFAULT_PLAN_DATES.thresholds,
          severity_per_threshold: DEFAULT_PLAN_DATES.severity_per_threshold,
          status: "active",
        },
        new Date()
      )
    : null;

  const initials = participant.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const prnMeds = medications.filter((m) => m.type === "prn");
  const websterMeds = medications.filter((m) => m.type === "webster_pak");

  function saveField(field: string, value: string) {
    startTransition(async () => {
      const result = await updateParticipant({
        id: participant.id,
        [field]: value,
      });
      if (result.success) {
        toast.success("Saved");
        setEditingField(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden shadow-card">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-primary/8 via-transparent to-transparent p-6 md:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-20 w-20 border-2 border-background shadow-card">
                {participant.photo_url ? (
                  <AvatarImage src={participant.photo_url} alt="" />
                ) : null}
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-heading md:text-3xl">
                    {participant.full_name}
                  </h1>
                  <Badge variant="outline">{participant.status}</Badge>
                </div>
                {participant.preferred_name ? (
                  <p className="text-muted-foreground">
                    Preferred: {participant.preferred_name}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>NDIS {participant.ndis_number}</span>
                  <span>{participant.house_name}</span>
                  {participant.primary_language ? (
                    <span>{participant.primary_language}</span>
                  ) : null}
                </div>
                {planCountdown && participant.plan_end_date ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-sm text-muted-foreground">
                      Plan ends {formatDate(participant.plan_end_date)}
                    </span>
                    <CountdownBadge
                      daysRemaining={planCountdown.days_remaining}
                      severity={planCountdown.severity}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="overview" className="rounded-xl">
            Overview
          </TabsTrigger>
          <TabsTrigger value="medications" className="rounded-xl">
            Medications
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-xl">
            Rules
          </TabsTrigger>
          <TabsTrigger value="goals" className="rounded-xl">
            Goals & Plan
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl">
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl">
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewSection
            participant={participant}
            canEdit={canEdit}
            editingField={editingField}
            pending={pending}
            onEdit={setEditingField}
            onSave={saveField}
            onCancel={() => setEditingField(null)}
          />
        </TabsContent>

        <TabsContent value="medications" className="space-y-6">
          {!canViewMedications ? (
            <ParticipantEmptyState
              icon={Pill}
              title="No access"
              description="You do not have permission to view medications."
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold tracking-heading">
                  PRN medications
                </h2>
                {canEdit ? (
                  <Button asChild size="sm" className="rounded-xl">
                    <Link
                      href={`/participants/${participant.id}/medications/new`}
                    >
                      Add PRN
                    </Link>
                  </Button>
                ) : null}
              </div>
              {prnMeds.length === 0 ? (
                <ParticipantEmptyState
                  icon={Pill}
                  title="No PRN medications"
                  description="PRN medications with expiry countdowns will appear here once added."
                  action={
                    canEdit ? (
                      <Button asChild className="rounded-xl">
                        <Link
                          href={`/participants/${participant.id}/medications/new`}
                        >
                          Add PRN medication
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid gap-4">
                  {prnMeds.map((med) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      participantId={participant.id}
                      participantName={participant.full_name}
                      houseId={participant.house_id}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              )}

              <h2 className="font-display text-lg font-semibold tracking-heading">
                Webster-pak
              </h2>
              {websterMeds.length === 0 ? (
                <ParticipantEmptyState
                  icon={Pill}
                  title="No Webster-pak record"
                  description="Blister pack details can be recorded when pharmacy-managed medications are set up."
                />
              ) : (
                <div className="grid gap-4">
                  {websterMeds.map((med) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      participantId={participant.id}
                      participantName={participant.full_name}
                      houseId={participant.house_id}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="rules">
          <RuleBuilder
            participantId={participant.id}
            houseId={participant.house_id}
            rules={rules}
            workers={workers}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsPlanTab participant={participant} />
        </TabsContent>

        <TabsContent value="documents">
          <ParticipantEmptyState
            icon={FolderOpen}
            title="Documents coming soon"
            description="Upload behaviour support plans, NDIS plans, and other documents once Supabase Storage is connected."
            action={
              participant.behaviour_support_plan_url ? (
                <Button asChild variant="outline" className="rounded-xl">
                  <a
                    href={participant.behaviour_support_plan_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open behaviour support plan
                  </a>
                </Button>
              ) : undefined
            }
          />
        </TabsContent>

        <TabsContent value="activity">
          {!canViewAudit ? (
            <ParticipantEmptyState
              icon={Activity}
              title="No access"
              description="You do not have permission to view the activity log."
            />
          ) : auditLogs.length === 0 ? (
            <ParticipantEmptyState
              icon={Activity}
              title="No activity yet"
              description="Changes to this participant will appear in the audit log once recorded."
            />
          ) : (
            <ul className="space-y-2">
              {auditLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border bg-card px-4 py-3 text-sm shadow-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium capitalize">{log.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.entity_type}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewSection({
  participant,
  canEdit,
  editingField,
  pending,
  onEdit,
  onSave,
  onCancel,
}: {
  participant: ParticipantRow & { house_name: string };
  canEdit: boolean;
  editingField: string | null;
  pending: boolean;
  onEdit: (field: string) => void;
  onSave: (field: string, value: string) => void;
  onCancel: () => void;
}) {
  const fields: { key: string; label: string; value: string | null }[] = [
    { key: "gender", label: "Gender", value: participant.gender },
    { key: "date_of_birth", label: "Date of birth", value: participant.date_of_birth },
    { key: "primary_language", label: "Language", value: participant.primary_language },
    { key: "cultural_background", label: "Cultural background", value: participant.cultural_background },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(({ key, label, value }) => (
        <EditableField
          key={key}
          label={label}
          value={value ?? ""}
          editing={editingField === key}
          canEdit={canEdit}
          pending={pending}
          onEdit={() => onEdit(key)}
          onSave={(v) => onSave(key, v)}
          onCancel={onCancel}
        />
      ))}
      <InfoBlock label="House" value={participant.house_name} />
      <InfoBlock
        label="Vehicle access"
        value={participant.has_vehicle_access ? "Yes" : "No"}
      />
      <InfoBlock
        label="Mobility aids"
        value={participant.mobility_aids?.join(", ") || "—"}
      />
      <InfoBlock
        label="Communication"
        value={participant.communication_methods?.join(", ") || "—"}
      />
    </div>
  );
}

function EditableField({
  label,
  value,
  editing,
  canEdit,
  pending,
  onEdit,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  editing: boolean;
  canEdit: boolean;
  pending: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <input
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            className="rounded-xl"
            disabled={pending}
            onClick={() => onSave(draft)}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-xl"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="rounded-2xl border bg-card p-4 text-left shadow-card transition-shadow hover:shadow-card-hover disabled:cursor-default"
      onClick={canEdit ? onEdit : undefined}
      disabled={!canEdit}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </button>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function GoalsPlanTab({ participant }: { participant: ParticipantRow }) {
  const goals = Array.isArray(participant.goals)
    ? (participant.goals as { title?: string; description?: string }[])
    : [];

  if (goals.length === 0 && !participant.plan_total_budget) {
    return (
      <ParticipantEmptyState
        icon={Target}
        title="No goals or plan budget"
        description="NDIS plan goals and budget breakdown will display here once entered."
      />
    );
  }

  return (
    <div className="space-y-6">
      {participant.plan_total_budget != null ? (
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total plan budget</p>
          <p className="font-display text-2xl font-semibold tracking-heading">
            ${participant.plan_total_budget.toLocaleString("en-AU")}
          </p>
          {participant.plan_start_date && participant.plan_end_date ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDate(participant.plan_start_date)} —{" "}
              {formatDate(participant.plan_end_date)}
            </p>
          ) : null}
        </div>
      ) : null}
      {goals.length > 0 ? (
        <ul className="space-y-3">
          {goals.map((goal, i) => (
            <li
              key={i}
              className="rounded-2xl border bg-card p-4 shadow-card"
            >
              <p className="font-medium">{goal.title}</p>
              {goal.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {goal.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
