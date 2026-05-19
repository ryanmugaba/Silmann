import {
  getMockParticipantById,
  MOCK_AUDIT_LOGS,
  MOCK_HOUSES,
  MOCK_MEDICATIONS,
  MOCK_PARTICIPANTS,
  MOCK_RULE_ROWS,
  MOCK_WORKER_PROFILES,
} from "@/lib/data/mock-participants";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, shouldUseMockData } from "@/lib/supabase/configured";
import type {
  AuditLogRow,
  HouseRow,
  ParticipantMedicationRow,
  ParticipantRow,
  ProfileRow,
  RuleRow,
} from "@/types/database";

export type ParticipantListItem = ParticipantRow & {
  house_name: string;
};

export type ParticipantDetailData = {
  participant: ParticipantListItem;
  medications: ParticipantMedicationRow[];
  ruleRows: RuleRow[];
  workers: Pick<ProfileRow, "id" | "full_name">[];
  auditLogs: AuditLogRow[];
  isMock: boolean;
};

export async function listParticipants(): Promise<{
  participants: ParticipantListItem[];
  houses: Pick<HouseRow, "id" | "name">[];
  isMock: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return shouldUseMockData()
      ? { participants: MOCK_PARTICIPANTS, houses: MOCK_HOUSES, isMock: true }
      : { participants: [], houses: [], isMock: false };
  }

  const supabase = await createClient();

  const { data: participantRows } = await supabase
    .from("participants")
    .select("*")
    .is("deleted_at", null)
    .order("full_name")
    .returns<ParticipantRow[]>();

  const { data: houseRows } = await supabase
    .from("houses")
    .select("id, name")
    .is("deleted_at", null)
    .order("name")
    .returns<Pick<HouseRow, "id" | "name">[]>();

  const houseMap = new Map((houseRows ?? []).map((h) => [h.id, h.name]));

  const participants = (participantRows ?? []).map((p) => ({
    ...p,
    house_name: houseMap.get(p.house_id) ?? "Unknown house",
  }));

  return {
    participants,
    houses: houseRows ?? [],
    isMock: false,
  };
}

export async function getParticipantDetail(
  id: string,
  organizationId: string
): Promise<ParticipantDetailData | null> {
  if (!isSupabaseConfigured()) {
    const participant = getMockParticipantById(id);
    if (!participant) return null;

    return {
      participant,
      medications: MOCK_MEDICATIONS.filter((m) => m.participant_id === id),
      ruleRows: MOCK_RULE_ROWS.filter((r) => r.entity_id === id),
      workers: MOCK_WORKER_PROFILES,
      auditLogs: MOCK_AUDIT_LOGS,
      isMock: true,
    };
  }

  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single<ParticipantRow>();

  if (!participant) return null;

  const { data: house } = await supabase
    .from("houses")
    .select("name")
    .eq("id", participant.house_id)
    .single<Pick<HouseRow, "name">>();

  const { data: medications } = await supabase
    .from("participant_medications")
    .select("*")
    .eq("participant_id", id)
    .is("deleted_at", null)
    .order("drug_name")
    .returns<ParticipantMedicationRow[]>();

  const { data: ruleRows } = await supabase
    .from("rules")
    .select("*")
    .eq("entity_type", "participant")
    .eq("entity_id", id)
    .is("deleted_at", null)
    .eq("is_active", true)
    .returns<RuleRow[]>();

  const { data: workers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .eq("role", "support_worker")
    .is("deleted_at", null)
    .returns<Pick<ProfileRow, "id" | "full_name">[]>();

  const { data: auditLogs } = await supabase
    .from("audit_log")
    .select("*")
    .eq("entity_type", "participants")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AuditLogRow[]>();

  return {
    participant: {
      ...participant,
      house_name: house?.name ?? "Unknown house",
    },
    medications: medications ?? [],
    ruleRows: ruleRows ?? [],
    workers: workers ?? [],
    auditLogs: auditLogs ?? [],
    isMock: false,
  };
}
