"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionErrorPublic,
  actionSuccess,
  zodFieldErrors,
} from "@/lib/actions/result";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import { withPermission } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type { IncidentRow } from "@/types/database";
import {
  closeIncidentSchema,
  createIncidentSchema,
  updateIncidentSchema,
} from "@/lib/validators/incidents";

function revalidateIncidents(id?: string) {
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/incidents/${id}`);
}

export async function createIncident(input: unknown) {
  const parsed = createIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid input", zodFieldErrors(parsed.error));
  }

  const data = parsed.data;

  return withPermission(
    PermissionKey.INCIDENT_CREATE,
    async (ctx) => {
      if (!isSupabaseConfigured()) return actionErrorPublic();
      if (
        data.house_id &&
        ctx.house_ids.length > 0 &&
        !ctx.house_ids.includes(data.house_id)
      ) {
        return actionError("You do not have access to this house");
      }

      const supabase = await createClient();
      const { data: row, error } = await supabase
        .from("incidents")
        .insert({
          organization_id: ctx.organization_id,
          house_id: data.house_id ?? null,
          participant_id: data.participant_id ?? null,
          reported_by: ctx.user_id,
          title: data.title,
          description: data.description,
          incident_type: data.incident_type,
          severity: data.severity,
          occurred_at: data.occurred_at,
          immediate_actions: data.immediate_actions ?? null,
          status: "open",
          created_by: ctx.user_id,
        })
        .select("id")
        .single();

      if (error) return actionErrorPublic(error, "incidents/create");

      revalidateIncidents(row?.id);
      return actionSuccess({ id: row?.id }, "Incident recorded");
    },
    data.house_id ? { house_id: data.house_id } : undefined
  );
}

export async function updateIncident(input: unknown) {
  const parsed = updateIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid input", zodFieldErrors(parsed.error));
  }

  return withPermission(PermissionKey.INCIDENT_EDIT, async (ctx) => {
    if (!isSupabaseConfigured()) return actionErrorPublic();

    const patch: Partial<IncidentRow> = {
      updated_by: ctx.user_id,
    };
    if (parsed.data.status) patch.status = parsed.data.status;
    if (parsed.data.follow_up_notes !== undefined) {
      patch.follow_up_notes = parsed.data.follow_up_notes;
    }
    if (parsed.data.immediate_actions !== undefined) {
      patch.immediate_actions = parsed.data.immediate_actions;
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("incidents")
      .update(patch)
      .eq("id", parsed.data.incident_id)
      .eq("organization_id", ctx.organization_id);

    if (error) return actionErrorPublic(error, "incidents/update");

    revalidateIncidents(parsed.data.incident_id);
    return actionSuccess(undefined, "Incident updated");
  });
}

export async function closeIncident(input: unknown) {
  const parsed = closeIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid input", zodFieldErrors(parsed.error));
  }

  return withPermission(PermissionKey.INCIDENT_CLOSE, async (ctx) => {
    if (!isSupabaseConfigured()) return actionErrorPublic();

    const supabase = await createClient();
    const { error } = await supabase
      .from("incidents")
      .update({
        status: "closed",
        follow_up_notes: parsed.data.follow_up_notes,
        closed_at: new Date().toISOString(),
        closed_by: ctx.user_id,
        updated_by: ctx.user_id,
      })
      .eq("id", parsed.data.incident_id)
      .eq("organization_id", ctx.organization_id);

    if (error) return actionErrorPublic(error, "incidents/close");

    revalidateIncidents(parsed.data.incident_id);
    return actionSuccess(undefined, "Incident closed");
  });
}
