import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ParticipantDetailView } from "@/components/participants/participant-detail-view";
import { Button } from "@/components/ui/button";
import { mapRuleRow } from "@/lib/participants/map-rule";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type {
  AuditLogRow,
  HouseRow,
  ParticipantMedicationRow,
  ParticipantRow,
  ProfileRow,
  RuleRow,
} from "@/types/database";

type PageProps = {
  params: { id: string };
};

export default async function ParticipantDetailPage({ params }: PageProps) {
  const { id } = params;
  const supabase = await createClient();
  const ctx = await getPermissionContext();

  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single<ParticipantRow>();

  if (!participant) {
    notFound();
  }

  if (
    !can(ctx, PermissionKey.PARTICIPANT_VIEW, {
      house_id: participant.house_id,
    })
  ) {
    notFound();
  }

  const { data: house } = await supabase
    .from("houses")
    .select("name")
    .eq("id", participant.house_id)
    .single<Pick<HouseRow, "name">>();

  const { data: medications } = await supabase
    .from("participant_medications")
    .select("*")
    .eq("participant_id", id)
    .eq("status", "active")
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
    .eq("organization_id", participant.organization_id)
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

  const canEdit = can(ctx, PermissionKey.PARTICIPANT_EDIT, {
    house_id: participant.house_id,
  });
  const canViewMedications = can(ctx, PermissionKey.MEDICATION_VIEW, {
    house_id: participant.house_id,
  });
  const canViewAudit = can(ctx, PermissionKey.AUDIT_LOG_VIEW);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="rounded-xl -ml-2">
        <Link href="/participants">
          <ChevronLeft className="mr-1 h-4 w-4" strokeWidth={1.5} />
          All participants
        </Link>
      </Button>
      <ParticipantDetailView
        participant={{
          ...participant,
          house_name: house?.name ?? "Unknown house",
        }}
        medications={medications ?? []}
        rules={(ruleRows ?? []).map(mapRuleRow)}
        workers={workers ?? []}
        auditLogs={auditLogs ?? []}
        canEdit={canEdit}
        canViewMedications={canViewMedications}
        canViewAudit={canViewAudit}
      />
    </div>
  );
}
