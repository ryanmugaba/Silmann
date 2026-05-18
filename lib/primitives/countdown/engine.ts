import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { computeCountdownStatus } from "./compute";
import type {
  CountdownEntity,
  CountdownEntityInsert,
  CountdownOrgFilters,
  CountdownResolution,
  CountdownStatusResult,
} from "./types";

type CountdownRow = Database["public"]["Tables"]["countdown_entities"]["Row"];
type CountdownEventRow = Database["public"]["Tables"]["countdown_events"]["Row"];

function mapRow(row: CountdownRow): CountdownEntity {
  return {
    id: row.id,
    organization_id: row.organization_id,
    entity_type: row.entity_type as CountdownEntity["entity_type"],
    entity_id: row.entity_id,
    label: row.label,
    expiry_date: row.expiry_date,
    thresholds: row.thresholds,
    severity_per_threshold: row.severity_per_threshold as CountdownEntity["severity_per_threshold"],
    notify_roles: row.notify_roles as CountdownEntity["notify_roles"],
    notify_users: row.notify_users ?? undefined,
    house_id: row.house_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    last_notified_at: row.last_notified_at,
    status: row.status as CountdownEntity["status"],
    resolution: row.resolution as CountdownEntity["resolution"],
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
    deleted_at: row.deleted_at,
  };
}

async function getFiredThresholds(
  supabase: SupabaseClient<Database>,
  entityId: string
): Promise<number[]> {
  const { data } = await supabase
    .from("countdown_events")
    .select("threshold_days")
    .eq("countdown_entity_id", entityId);

  return (data ?? []).map((e: Pick<CountdownEventRow, "threshold_days">) => e.threshold_days);
}

export async function register(
  entity: CountdownEntityInsert,
  userId?: string
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countdown_entities")
    .insert({
      organization_id: entity.organization_id,
      entity_type: entity.entity_type,
      entity_id: entity.entity_id,
      label: entity.label,
      expiry_date: entity.expiry_date,
      thresholds: entity.thresholds,
      severity_per_threshold: entity.severity_per_threshold,
      notify_roles: entity.notify_roles,
      notify_users: entity.notify_users ?? null,
      house_id: entity.house_id ?? null,
      metadata: entity.metadata as Json,
      status: "active",
      created_by: userId ?? null,
      updated_by: userId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to register countdown: ${error.message}`);
  }

  return data.id;
}

export async function update(
  id: string,
  partial: Partial<CountdownEntityInsert>,
  userId?: string
): Promise<void> {
  const supabase = await createClient();

  const patch: Database["public"]["Tables"]["countdown_entities"]["Update"] = {
    ...partial,
    metadata: partial.metadata as Json | undefined,
    updated_by: userId ?? null,
  };
  const { error } = await supabase
    .from("countdown_entities")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to update countdown: ${error.message}`);
  }
}

export async function resolve(
  id: string,
  resolution: CountdownResolution,
  newExpiry?: string,
  userId?: string
): Promise<void> {
  const supabase = await createClient();

  const updates: Database["public"]["Tables"]["countdown_entities"]["Update"] = {
    status: "resolved",
    resolution,
    updated_by: userId ?? null,
  };

  if (resolution === "renewed" || resolution === "extended") {
    if (!newExpiry) {
      throw new Error("new_expiry is required for renewed or extended resolutions");
    }
    updates.expiry_date = newExpiry;
    updates.status = "active";
    updates.resolution = null;
  }

  const { error } = await supabase
    .from("countdown_entities")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to resolve countdown: ${error.message}`);
  }
}

export async function acknowledge(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error: entityError } = await supabase
    .from("countdown_entities")
    .update({
      status: "acknowledged",
      updated_by: userId,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (entityError) {
    throw new Error(`Failed to acknowledge countdown: ${entityError.message}`);
  }

  const { error: eventError } = await supabase
    .from("countdown_events")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId,
    })
    .eq("countdown_entity_id", id)
    .is("acknowledged_at", null);

  if (eventError) {
    throw new Error(`Failed to acknowledge countdown events: ${eventError.message}`);
  }
}

export async function getStatus(id: string): Promise<CountdownStatusResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countdown_entities")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error(`Countdown entity not found: ${error?.message ?? id}`);
  }

  const fired = await getFiredThresholds(supabase, id);
  return computeCountdownStatus(mapRow(data), new Date(), fired);
}

export async function getEntitiesForOrg(
  orgId: string,
  filters?: CountdownOrgFilters
): Promise<CountdownEntity[]> {
  const supabase = await createClient();

  let query = supabase
    .from("countdown_entities")
    .select("*")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("expiry_date", { ascending: true });

  if (filters?.house_id) {
    query = query.eq("house_id", filters.house_id);
  }
  if (filters?.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch countdown entities: ${error.message}`);
  }

  let entities = (data ?? []).map(mapRow);

  if (filters?.severity) {
    const withSeverity = await Promise.all(
      entities.map(async (entity) => ({
        entity,
        status: await getStatus(entity.id),
      }))
    );
    entities = withSeverity
      .filter(({ status }) => status.severity === filters.severity)
      .map(({ entity }) => entity);
  }

  return entities;
}

/** Service-role access for cron jobs. */
export async function getActiveEntitiesForCron(): Promise<CountdownEntity[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("countdown_entities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to fetch active countdowns: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function insertCountdownEvent(
  supabase: SupabaseClient<Database>,
  entityId: string,
  thresholdDays: number,
  severity: CountdownEntity["severity_per_threshold"][number]
): Promise<void> {
  const { error } = await supabase.from("countdown_events").insert({
    countdown_entity_id: entityId,
    threshold_days: thresholdDays,
    severity,
  });

  if (error) {
    throw new Error(`Failed to insert countdown event: ${error.message}`);
  }
}

export async function getEntityEvents(
  supabase: SupabaseClient<Database>,
  entityId: string
): Promise<CountdownEventRow[]> {
  const { data, error } = await supabase
    .from("countdown_events")
    .select("*")
    .eq("countdown_entity_id", entityId);

  if (error) {
    throw new Error(`Failed to fetch countdown events: ${error.message}`);
  }

  return data ?? [];
}
