"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionSuccess,
  zodFieldErrors,
  type ActionResult,
} from "@/lib/actions/result";
import * as countdown from "@/lib/primitives/countdown/engine";
import {
  DEFAULT_MEDICATION,
  DEFAULT_PLAN_DATES,
} from "@/lib/primitives/countdown/types";
import { PermissionKey, withPermission } from "@/lib/primitives/rbac";
import {
  ForbiddenError,
  type PermissionContext,
  type ResourceScope,
} from "@/lib/primitives/rbac/types";
import {
  buildGenderRestrictionRule,
  buildLanguageRequiredRule,
  buildNoVehicleRule,
  buildRestrictedPairingRule,
} from "@/lib/primitives/rules/builder";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import {
  addMedicationSchema,
  addParticipantRuleSchema,
  archiveParticipantSchema,
  ceaseMedicationSchema,
  createParticipantSchema,
  logPrnAdministrationSchema,
  removeParticipantRuleSchema,
  updateParticipantSchema,
} from "@/lib/validators/participants";
import type { Database, Json, ParticipantRow } from "@/types/database";

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function participantPaths(id?: string): string[] {
  const paths = ["/participants"];
  if (id) {
    paths.push(`/participants/${id}`);
  }
  return paths;
}

function revalidateParticipants(id?: string) {
  for (const path of participantPaths(id)) {
    revalidatePath(path);
  }
}

async function writeAudit(
  organizationId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown
) {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    organization_id: organizationId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_state: before as Json,
    after_state: after as Json,
  });
}

async function runWithPermission<T>(
  permission: PermissionKey,
  resource: ResourceScope | undefined,
  handler: (ctx: PermissionContext) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await withPermission(permission, handler, resource);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return actionError(error.message);
    }
    throw error;
  }
}

async function getParticipantHouseId(
  participantId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    const { getMockParticipantById } = await import("@/lib/data/mock-participants");
    return getMockParticipantById(participantId)?.house_id ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("participants")
    .select("house_id")
    .eq("id", participantId)
    .is("deleted_at", null)
    .single<{ house_id: string }>();
  return data?.house_id ?? null;
}

export async function createParticipant(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid participant data", zodFieldErrors(parsed.error));
  }

  const data = parsed.data;

  return runWithPermission(
    PermissionKey.PARTICIPANT_CREATE,
    { house_id: data.house_id },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        const mockId = crypto.randomUUID();
        revalidateParticipants(mockId);
        return actionSuccess(
          { id: mockId },
          "Demo mode: participant recorded locally."
        );
      }

      const supabase = await createClient();

      const insert: Database["public"]["Tables"]["participants"]["Insert"] = {
        organization_id: ctx.organization_id,
        house_id: data.house_id,
        ndis_number: data.ndis_number,
        full_name: data.full_name,
        preferred_name: emptyToNull(data.preferred_name),
        date_of_birth: emptyToNull(data.date_of_birth),
        gender: emptyToNull(data.gender),
        primary_language: emptyToNull(data.primary_language),
        secondary_languages: data.secondary_languages,
        cultural_background: emptyToNull(data.cultural_background),
        photo_url: emptyToNull(data.photo_url),
        emergency_contacts: data.emergency_contacts as Json,
        gp_details: data.gp_details as Json,
        plan_start_date: emptyToNull(data.plan_start_date),
        plan_end_date: emptyToNull(data.plan_end_date),
        plan_total_budget: data.plan_total_budget ?? null,
        plan_budget_by_category: data.plan_budget_by_category as Json,
        goals: data.goals as Json,
        dietary: data.dietary as Json,
        preferences: data.preferences as Json,
        has_vehicle_access: data.has_vehicle_access,
        mobility_aids: data.mobility_aids,
        communication_methods: data.communication_methods,
        behaviour_support_plan_url: emptyToNull(data.behaviour_support_plan_url),
        status: "active",
        created_by: ctx.user_id,
        updated_by: ctx.user_id,
      };

      const { data: row, error } = await supabase
        .from("participants")
        .insert(insert)
        .select("id, plan_end_date, full_name")
        .single<Pick<ParticipantRow, "id" | "plan_end_date" | "full_name">>();

      if (error || !row) {
        return actionError(error?.message ?? "Failed to create participant");
      }

      if (row.plan_end_date) {
        await countdown.register(
          {
            organization_id: ctx.organization_id,
            entity_type: "plan_dates",
            entity_id: row.id,
            label: `${row.full_name} — NDIS plan`,
            expiry_date: row.plan_end_date,
            thresholds: DEFAULT_PLAN_DATES.thresholds,
            severity_per_threshold: DEFAULT_PLAN_DATES.severity_per_threshold,
            notify_roles: ["owner", "team_leader"],
            house_id: data.house_id,
            metadata: { participant_id: row.id },
          },
          ctx.user_id
        );
      }

      if (!data.has_vehicle_access) {
        const rule = buildNoVehicleRule(
          row.id,
          ctx.organization_id,
          data.house_id
        );
        await supabase.from("rules").insert({
          ...rule,
          condition: rule.condition as Json,
          created_by: ctx.user_id,
        });
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "create",
        "participants",
        row.id,
        null,
        insert
      );

      revalidateParticipants(row.id);
      return actionSuccess({ id: row.id }, "Participant created");
    }
  );
}

export async function updateParticipant(
  input: unknown
): Promise<ActionResult> {
  const parsed = updateParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid update data", zodFieldErrors(parsed.error));
  }

  const { id, ...fields } = parsed.data;
  const scopeHouseId = await getParticipantHouseId(id);
  if (!scopeHouseId) {
    return actionError("Participant not found");
  }

  return runWithPermission(
    PermissionKey.PARTICIPANT_EDIT,
    { house_id: fields.house_id ?? scopeHouseId },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        revalidateParticipants(id);
        return actionSuccess(undefined, "Demo mode: update recorded locally.");
      }

      const supabase = await createClient();

      const { data: existing, error: fetchError } = await supabase
        .from("participants")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .single<ParticipantRow>();

      if (fetchError || !existing) {
        return actionError("Participant not found");
      }

      const patch: Partial<ParticipantRow> = {
        updated_by: ctx.user_id,
      };

      if (fields.full_name !== undefined) patch.full_name = fields.full_name;
      if (fields.preferred_name !== undefined) {
        patch.preferred_name = emptyToNull(fields.preferred_name);
      }
      if (fields.date_of_birth !== undefined) {
        patch.date_of_birth = emptyToNull(fields.date_of_birth);
      }
      if (fields.ndis_number !== undefined) patch.ndis_number = fields.ndis_number;
      if (fields.gender !== undefined) patch.gender = emptyToNull(fields.gender);
      if (fields.primary_language !== undefined) {
        patch.primary_language = emptyToNull(fields.primary_language);
      }
      if (fields.secondary_languages !== undefined) {
        patch.secondary_languages = fields.secondary_languages;
      }
      if (fields.cultural_background !== undefined) {
        patch.cultural_background = emptyToNull(fields.cultural_background);
      }
      if (fields.photo_url !== undefined) {
        patch.photo_url = emptyToNull(fields.photo_url);
      }
      if (fields.house_id !== undefined) patch.house_id = fields.house_id;
      if (fields.plan_start_date !== undefined) {
        patch.plan_start_date = emptyToNull(fields.plan_start_date);
      }
      if (fields.plan_end_date !== undefined) {
        patch.plan_end_date = emptyToNull(fields.plan_end_date);
      }
      if (fields.plan_total_budget !== undefined) {
        patch.plan_total_budget = fields.plan_total_budget;
      }
      if (fields.plan_budget_by_category !== undefined) {
        patch.plan_budget_by_category = fields.plan_budget_by_category as Json;
      }
      if (fields.goals !== undefined) patch.goals = fields.goals as Json;
      if (fields.dietary !== undefined) patch.dietary = fields.dietary as Json;
      if (fields.preferences !== undefined) {
        patch.preferences = fields.preferences as Json;
      }
      if (fields.has_vehicle_access !== undefined) {
        patch.has_vehicle_access = fields.has_vehicle_access;
      }
      if (fields.mobility_aids !== undefined) {
        patch.mobility_aids = fields.mobility_aids;
      }
      if (fields.communication_methods !== undefined) {
        patch.communication_methods = fields.communication_methods;
      }
      if (fields.behaviour_support_plan_url !== undefined) {
        patch.behaviour_support_plan_url = emptyToNull(
          fields.behaviour_support_plan_url
        );
      }
      if (fields.emergency_contacts !== undefined) {
        patch.emergency_contacts = fields.emergency_contacts as Json;
      }
      if (fields.gp_details !== undefined) {
        patch.gp_details = fields.gp_details as Json;
      }
      if (fields.status !== undefined) patch.status = fields.status;

      const { error } = await supabase
        .from("participants")
        .update(patch)
        .eq("id", id);

      if (error) {
        return actionError(error.message);
      }

      const planEnd = fields.plan_end_date ?? existing.plan_end_date;
      const name = fields.full_name ?? existing.full_name;
      if (planEnd) {
        const { data: countdownRows } = await supabase
          .from("countdown_entities")
          .select("id")
          .eq("entity_type", "plan_dates")
          .eq("entity_id", id)
          .is("deleted_at", null)
          .limit(1);

        if (countdownRows?.[0]?.id) {
          await countdown.update(
            countdownRows[0].id,
            {
              expiry_date: planEnd,
              label: `${name} — NDIS plan`,
            },
            ctx.user_id
          );
        } else {
          await countdown.register(
            {
              organization_id: ctx.organization_id,
              entity_type: "plan_dates",
              entity_id: id,
              label: `${name} — NDIS plan`,
              expiry_date: planEnd,
              thresholds: DEFAULT_PLAN_DATES.thresholds,
              severity_per_threshold: DEFAULT_PLAN_DATES.severity_per_threshold,
              notify_roles: ["owner", "team_leader"],
              house_id: fields.house_id ?? existing.house_id,
              metadata: { participant_id: id },
            },
            ctx.user_id
          );
        }
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "update",
        "participants",
        id,
        existing,
        { ...existing, ...patch }
      );

      revalidateParticipants(id);
      return actionSuccess(undefined, "Participant updated");
    }
  );
}

export async function archiveParticipant(
  input: unknown
): Promise<ActionResult> {
  const parsed = archiveParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid request", zodFieldErrors(parsed.error));
  }

  const houseId = await getParticipantHouseId(parsed.data.id);
  if (!houseId) {
    return actionError("Participant not found");
  }

  return runWithPermission(
    PermissionKey.PARTICIPANT_ARCHIVE,
    { house_id: houseId },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        revalidateParticipants(parsed.data.id);
        return actionSuccess(undefined, "Demo mode: participant archived locally.");
      }

      const supabase = await createClient();

      const { data: existing } = await supabase
        .from("participants")
        .select("*")
        .eq("id", parsed.data.id)
        .single<ParticipantRow>();

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("participants")
        .update({
          status: "archived",
          deleted_at: now,
          updated_by: ctx.user_id,
        })
        .eq("id", parsed.data.id);

      if (error) {
        return actionError(error.message);
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "archive",
        "participants",
        parsed.data.id,
        existing,
        { status: "archived", deleted_at: now }
      );

      revalidateParticipants(parsed.data.id);
      return actionSuccess(undefined, "Participant archived");
    }
  );
}

export async function addMedication(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = addMedicationSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid medication data", zodFieldErrors(parsed.error));
  }

  const data = parsed.data;
  const houseId = await getParticipantHouseId(data.participant_id);
  if (!houseId) {
    return actionError("Participant not found");
  }

  return runWithPermission(
    PermissionKey.MEDICATION_EDIT,
    { house_id: houseId },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        revalidateParticipants(data.participant_id);
        return actionSuccess(
          { id: crypto.randomUUID() },
          "Demo mode: medication recorded locally."
        );
      }

      const supabase = await createClient();

      const { data: participant } = await supabase
        .from("participants")
        .select("house_id, full_name")
        .eq("id", data.participant_id)
        .is("deleted_at", null)
        .single<{ house_id: string; full_name: string }>();

      if (!participant) {
        return actionError("Participant not found");
      }

      const { data: med, error } = await supabase
        .from("participant_medications")
        .insert({
          organization_id: ctx.organization_id,
          participant_id: data.participant_id,
          drug_name: data.drug_name,
          strength: emptyToNull(data.strength),
          form: emptyToNull(data.form),
          prescriber: emptyToNull(data.prescriber),
          script_date: emptyToNull(data.script_date),
          expiry_date: emptyToNull(data.expiry_date),
          indication: emptyToNull(data.indication),
          max_dose_per_24h: emptyToNull(data.max_dose_per_24h),
          min_interval_hours: data.min_interval_hours ?? null,
          photo_url: emptyToNull(data.photo_url),
          storage_location: emptyToNull(data.storage_location),
          stock_count: data.stock_count ?? null,
          type: data.type,
          webster_pak_pharmacy_name: emptyToNull(data.webster_pak_pharmacy_name),
          webster_pak_collection_day: emptyToNull(data.webster_pak_collection_day),
          status: "active",
          created_by: ctx.user_id,
          updated_by: ctx.user_id,
        })
        .select("id, drug_name, expiry_date, type")
        .single<{
          id: string;
          drug_name: string;
          expiry_date: string | null;
          type: string;
        }>();

      if (error || !med) {
        return actionError(error?.message ?? "Failed to add medication");
      }

      if (med.type === "prn" && med.expiry_date) {
        await countdown.register(
          {
            organization_id: ctx.organization_id,
            entity_type: "medication",
            entity_id: med.id,
            label: `${participant.full_name} — ${med.drug_name}`,
            expiry_date: med.expiry_date,
            thresholds: DEFAULT_MEDICATION.thresholds,
            severity_per_threshold: DEFAULT_MEDICATION.severity_per_threshold,
            notify_roles: ["owner", "team_leader"],
            house_id: participant.house_id,
            metadata: {
              participant_id: data.participant_id,
              medication_id: med.id,
            },
          },
          ctx.user_id
        );
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "create",
        "participant_medications",
        med.id,
        null,
        data
      );

      revalidateParticipants(data.participant_id);
      return actionSuccess({ id: med.id }, "Medication added");
    }
  );
}

export async function ceaseMedication(
  input: unknown
): Promise<ActionResult> {
  const parsed = ceaseMedicationSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid request", zodFieldErrors(parsed.error));
  }

  const houseId = await getParticipantHouseId(parsed.data.participant_id);
  if (!houseId) {
    return actionError("Participant not found");
  }

  return runWithPermission(
    PermissionKey.MEDICATION_EDIT,
    { house_id: houseId },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        revalidateParticipants(parsed.data.participant_id);
        return actionSuccess(undefined, "Demo mode: medication ceased locally.");
      }

      const supabase = await createClient();

      const { error } = await supabase
        .from("participant_medications")
        .update({
          status: "ceased",
          updated_by: ctx.user_id,
        })
        .eq("id", parsed.data.medication_id);

      if (error) {
        return actionError(error.message);
      }

      const { data: countdownRows } = await supabase
        .from("countdown_entities")
        .select("id")
        .eq("entity_type", "medication")
        .eq("entity_id", parsed.data.medication_id)
        .is("deleted_at", null);

      for (const row of countdownRows ?? []) {
        await countdown.resolve(row.id, "ceased", undefined, ctx.user_id);
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "cease",
        "participant_medications",
        parsed.data.medication_id,
        { status: "active" },
        { status: "ceased" }
      );

      revalidateParticipants(parsed.data.participant_id);
      return actionSuccess(undefined, "Medication ceased");
    }
  );
}

export async function logPRNAdministration(
  input: unknown
): Promise<ActionResult> {
  const parsed = logPrnAdministrationSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid administration log", zodFieldErrors(parsed.error));
  }

  const data = parsed.data;
  const houseId = await getParticipantHouseId(data.participant_id);
  if (!houseId) {
    return actionError("Participant not found");
  }

  return runWithPermission(
    PermissionKey.MEDICATION_ADMINISTER,
    { house_id: houseId },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        revalidateParticipants(data.participant_id);
        return actionSuccess(undefined, "Demo mode: administration logged locally.");
      }

      const supabase = await createClient();

      const { error } = await supabase.from("prn_administration_log").insert({
        organization_id: ctx.organization_id,
        participant_id: data.participant_id,
        medication_id: data.medication_id,
        administered_by: ctx.user_id,
        administered_at: data.administered_at,
        reason: data.reason,
        dose_given: data.dose_given,
        effect_30min_followup: emptyToNull(data.effect_30min_followup),
        notes: emptyToNull(data.notes),
      });

      if (error) {
        return actionError(error.message);
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "administer",
        "prn_administration_log",
        data.medication_id,
        null,
        data
      );

      revalidateParticipants(data.participant_id);
      return actionSuccess(undefined, "PRN administration logged");
    }
  );
}

export async function addParticipantRule(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = addParticipantRuleSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid rule data", zodFieldErrors(parsed.error));
  }

  const data = parsed.data;
  const participantHouseId = await getParticipantHouseId(data.participant_id);
  if (!participantHouseId) {
    return actionError("Participant not found");
  }

  const houseId = data.house_id ?? participantHouseId;

  return runWithPermission(
    PermissionKey.PARTICIPANT_EDIT,
    { house_id: houseId },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        revalidateParticipants(data.participant_id);
        return actionSuccess(
          { id: crypto.randomUUID() },
          "Demo mode: rule recorded locally."
        );
      }

      const supabase = await createClient();
      let rule;

      switch (data.rule_type) {
        case "no_vehicle":
          rule = buildNoVehicleRule(
            data.participant_id,
            ctx.organization_id,
            houseId
          );
          break;
        case "gender_restriction":
          rule = buildGenderRestrictionRule(
            data.participant_id,
            ctx.organization_id,
            data.not_gender!,
            houseId
          );
          break;
        case "restricted_pairing":
          rule = buildRestrictedPairingRule(
            data.participant_id,
            data.worker_id!,
            ctx.organization_id,
            houseId
          );
          break;
        case "language_required":
          rule = buildLanguageRequiredRule(
            data.participant_id,
            ctx.organization_id,
            data.language!,
            houseId
          );
          break;
      }

      if (data.message) {
        rule.message = data.message;
      }

      const { data: inserted, error } = await supabase
        .from("rules")
        .insert({
          ...rule,
          condition: rule.condition as Json,
          created_by: ctx.user_id,
        })
        .select("id")
        .single<{ id: string }>();

      if (error || !inserted) {
        return actionError(error?.message ?? "Failed to add rule");
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "create",
        "rules",
        inserted.id,
        null,
        rule
      );

      revalidateParticipants(data.participant_id);
      return actionSuccess({ id: inserted.id }, "Rule added");
    }
  );
}

export async function removeParticipantRule(
  input: unknown
): Promise<ActionResult> {
  const parsed = removeParticipantRuleSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid request", zodFieldErrors(parsed.error));
  }

  const houseId = await getParticipantHouseId(parsed.data.participant_id);
  if (!houseId) {
    return actionError("Participant not found");
  }

  return runWithPermission(
    PermissionKey.PARTICIPANT_EDIT,
    { house_id: houseId },
    async (ctx) => {
      if (!isSupabaseConfigured()) {
        revalidateParticipants(parsed.data.participant_id);
        return actionSuccess(undefined, "Demo mode: rule removed locally.");
      }

      const supabase = await createClient();

      const { data: existing } = await supabase
        .from("rules")
        .select("*")
        .eq("id", parsed.data.rule_id)
        .single();

      const { error } = await supabase
        .from("rules")
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          updated_by: ctx.user_id,
        })
        .eq("id", parsed.data.rule_id)
        .eq("entity_id", parsed.data.participant_id);

      if (error) {
        return actionError(error.message);
      }

      await writeAudit(
        ctx.organization_id,
        ctx.user_id,
        "delete",
        "rules",
        parsed.data.rule_id,
        existing,
        { is_active: false }
      );

      revalidateParticipants(parsed.data.participant_id);
      return actionSuccess(undefined, "Rule removed");
    }
  );
}
