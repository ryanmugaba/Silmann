import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import { COMPLIANCE_DOC_LABELS } from "@/lib/types/workers";
import type { ComplianceDocType } from "@/lib/types/workers";
import type { Json } from "@/types/database";

const COMPLIANCE_RULE_CONDITION = "compliance_doc_expired" as const;

function expiryRuleMessage(docType: ComplianceDocType, expiryDate: string): string {
  const label = COMPLIANCE_DOC_LABELS[docType] ?? docType;
  return `Cannot roster: ${label} expired on ${expiryDate}.`;
}

/**
 * Registers a hidden Block rule when a compliance document expires.
 */
export async function syncComplianceExpiryRule(params: {
  organizationId: string;
  workerId: string;
  docType: ComplianceDocType;
  expiryDate: string;
  createdBy: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const message = expiryRuleMessage(params.docType, params.expiryDate);

  const { data: existingRules } = await supabase
    .from("rules")
    .select("id, condition")
    .eq("organization_id", params.organizationId)
    .eq("entity_type", "worker")
    .eq("entity_id", params.workerId)
    .eq("is_active", true)
    .is("deleted_at", null);

  const existing = (existingRules ?? []).find((r) => {
    const cond = r.condition as { type?: string; doc_type?: string };
    return (
      cond?.type === COMPLIANCE_RULE_CONDITION &&
      cond?.doc_type === params.docType
    );
  });

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("rules")
    .insert({
      organization_id: params.organizationId,
      entity_type: "worker",
      entity_id: params.workerId,
      condition: {
        type: COMPLIANCE_RULE_CONDITION,
        doc_type: params.docType,
        expiry_date: params.expiryDate,
      } as Json,
      severity: "block",
      message,
      requires_reason: false,
      is_active: true,
      created_by: params.createdBy,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create compliance rule: ${error.message}`);
  }

  return data?.id ?? null;
}

/**
 * Deactivates the expiry block rule when a document is renewed and approved.
 */
export async function removeComplianceExpiryRule(params: {
  organizationId: string;
  workerId: string;
  docType: ComplianceDocType;
  updatedBy: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("rules")
    .select("id, condition")
    .eq("organization_id", params.organizationId)
    .eq("entity_type", "worker")
    .eq("entity_id", params.workerId)
    .eq("is_active", true)
    .is("deleted_at", null);

  const matching = (rules ?? []).filter((r) => {
    const cond = r.condition as { type?: string; doc_type?: string };
    return (
      cond?.type === COMPLIANCE_RULE_CONDITION &&
      cond?.doc_type === params.docType
    );
  });

  for (const rule of matching) {
    await supabase
      .from("rules")
      .update({
        is_active: false,
        updated_by: params.updatedBy,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", rule.id);
  }
}
