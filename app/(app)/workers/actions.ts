"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, zodFieldErrors } from "@/lib/actions/result";
import { register } from "@/lib/primitives/countdown/engine";
import { DEFAULT_COMPLIANCE_DOC } from "@/lib/primitives/countdown/types";
import {
  removeComplianceExpiryRule,
  syncComplianceExpiryRule,
} from "@/lib/primitives/rules/integrations/worker-compliance";
import { withPermission } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import {
  approveComplianceDocSchema,
  bulkApproveComplianceSchema,
  inviteWorkerSchema,
  rejectComplianceDocSchema,
  submitComplianceDocSchema,
  updateWorkerSchema,
  workerRuleSchema,
} from "@/lib/validators/workers";
import type { ComplianceDocType } from "@/lib/types/workers";
import type { ComplianceDocumentRow } from "@/types/database";

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
    before_state: before as import("@/types/database").Json,
    after_state: after as import("@/types/database").Json,
  });
}

export async function inviteWorker(formData: FormData) {
  return withPermission(PermissionKey.WORKER_CREATE, async (ctx) => {
    const parsed = inviteWorkerSchema.safeParse({
      email: formData.get("email"),
      employmentType: formData.get("employmentType") || undefined,
      houseIds: formData.getAll("houseIds"),
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      return actionSuccess(
        { inviteToken: "mock-invite-token" },
        "Demo mode: invitation recorded locally."
      );
    }

    const supabase = await createClient();
    const token = crypto.randomUUID();

    const { error } = await supabase.from("invitations").insert({
      organization_id: ctx.organization_id,
      email: parsed.data.email,
      role: "support_worker",
      invited_by: ctx.user_id,
      token,
      house_ids: parsed.data.houseIds,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) return actionError(error.message);

    await writeAudit(
      ctx.organization_id,
      ctx.user_id,
      "worker.invite",
      "invitation",
      token,
      null,
      parsed.data
    );

    revalidatePath("/workers");
    return actionSuccess({ inviteToken: token }, "Invitation sent");
  });
}

export async function updateWorker(formData: FormData) {
  return withPermission(PermissionKey.WORKER_EDIT, async (ctx) => {
    const parsed = updateWorkerSchema.safeParse({
      workerId: formData.get("workerId"),
      employmentType: formData.get("employmentType") || undefined,
      schadsLevel: formData.get("schadsLevel") || undefined,
      status: formData.get("status") || undefined,
      phone: formData.get("phone") || undefined,
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath(`/workers/${parsed.data.workerId}`);
      return actionSuccess(undefined, "Demo mode: worker updated.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("workers")
      .update({
        employment_type: parsed.data.employmentType,
        schads_level: parsed.data.schadsLevel,
        status: parsed.data.status,
        updated_by: ctx.user_id,
      })
      .eq("id", parsed.data.workerId)
      .eq("organization_id", ctx.organization_id);

    if (error) return actionError(error.message);

    if (parsed.data.phone) {
      const { data: worker } = await supabase
        .from("workers")
        .select("worker_profile_id")
        .eq("id", parsed.data.workerId)
        .single();

      if (worker?.worker_profile_id) {
        await supabase
          .from("profiles")
          .update({ phone: parsed.data.phone, updated_at: new Date().toISOString() })
          .eq("id", worker.worker_profile_id);
      }
    }

    revalidatePath("/workers");
    revalidatePath(`/workers/${parsed.data.workerId}`);
    return actionSuccess(undefined, "Worker updated");
  });
}

export async function submitComplianceDoc(formData: FormData) {
  return withPermission(PermissionKey.COMPLIANCE_SUBMIT, async (ctx) => {
    const parsed = submitComplianceDocSchema.safeParse({
      workerId: formData.get("workerId"),
      docType: formData.get("docType"),
      docName: formData.get("docName"),
      fileUrl: formData.get("fileUrl") || "",
      issuedDate: formData.get("issuedDate") || undefined,
      expiryDate: formData.get("expiryDate"),
      issuingBody: formData.get("issuingBody") || undefined,
      documentNumber: formData.get("documentNumber") || undefined,
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath("/my-compliance");
      return actionSuccess(undefined, "Demo mode: document submitted for approval.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("compliance_documents")
      .insert({
        organization_id: ctx.organization_id,
        worker_id: parsed.data.workerId,
        doc_type: parsed.data.docType,
        doc_name: parsed.data.docName,
        file_url: parsed.data.fileUrl || null,
        issued_date: parsed.data.issuedDate ?? null,
        expiry_date: parsed.data.expiryDate,
        issuing_body: parsed.data.issuingBody ?? null,
        document_number: parsed.data.documentNumber ?? null,
        status: "pending_approval",
        created_by: ctx.user_id,
      })
      .select("id")
      .single();

    if (error) return actionError(error.message);

    revalidatePath("/my-compliance");
    revalidatePath("/workers");
    return actionSuccess({ documentId: data?.id }, "Document submitted for approval");
  });
}

export async function approveComplianceDoc(formData: FormData) {
  return withPermission(PermissionKey.COMPLIANCE_APPROVE, async (ctx) => {
    const parsed = approveComplianceDocSchema.safeParse({
      documentId: formData.get("documentId"),
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath("/workers");
      return actionSuccess(undefined, "Demo mode: document approved.");
    }

    const supabase = await createClient();
    const { data: doc, error: fetchError } = await supabase
      .from("compliance_documents")
      .select("*, workers(id, worker_profile_id)")
      .eq("id", parsed.data.documentId)
      .eq("organization_id", ctx.organization_id)
      .single<ComplianceDocumentRow>();

    if (fetchError || !doc) return actionError("Document not found");

    const { error } = await supabase
      .from("compliance_documents")
      .update({
        status: "approved",
        approved_by: ctx.user_id,
        approved_at: new Date().toISOString(),
        updated_by: ctx.user_id,
      })
      .eq("id", parsed.data.documentId);

    if (error) return actionError(error.message);

    if (doc.expiry_date) {
      await register(
        {
          organization_id: ctx.organization_id,
          entity_type: "compliance_document",
          entity_id: doc.id,
          label: doc.doc_name,
          expiry_date: doc.expiry_date,
          thresholds: DEFAULT_COMPLIANCE_DOC.thresholds,
          severity_per_threshold: DEFAULT_COMPLIANCE_DOC.severity_per_threshold,
          notify_roles: ["team_leader", "owner"],
          metadata: { worker_id: doc.worker_id, doc_type: doc.doc_type },
        },
        ctx.user_id
      );

      await removeComplianceExpiryRule({
        organizationId: ctx.organization_id,
        workerId: doc.worker_id,
        docType: doc.doc_type as ComplianceDocType,
        updatedBy: ctx.user_id,
      });
    }

    revalidatePath("/workers");
    revalidatePath(`/workers/${doc.worker_id}`);
    revalidatePath(`/workers/${doc.worker_id}/compliance`);
    return actionSuccess(undefined, "Document approved");
  });
}

export async function rejectComplianceDoc(formData: FormData) {
  return withPermission(PermissionKey.COMPLIANCE_APPROVE, async (ctx) => {
    const parsed = rejectComplianceDocSchema.safeParse({
      documentId: formData.get("documentId"),
      rejectedReason: formData.get("rejectedReason"),
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath("/workers");
      return actionSuccess(undefined, "Demo mode: document rejected.");
    }

    const supabase = await createClient();
    const { data: doc } = await supabase
      .from("compliance_documents")
      .select("worker_id")
      .eq("id", parsed.data.documentId)
      .single();

    const { error } = await supabase
      .from("compliance_documents")
      .update({
        status: "rejected",
        rejected_reason: parsed.data.rejectedReason,
        updated_by: ctx.user_id,
      })
      .eq("id", parsed.data.documentId)
      .eq("organization_id", ctx.organization_id);

    if (error) return actionError(error.message);

    if (doc?.worker_id) {
      revalidatePath(`/workers/${doc.worker_id}`);
    }
    revalidatePath("/workers");
    return actionSuccess(undefined, "Document rejected");
  });
}

export async function bulkApproveCompliance(formData: FormData) {
  return withPermission(PermissionKey.COMPLIANCE_APPROVE, async (ctx) => {
    const ids = formData.getAll("documentIds");
    const parsed = bulkApproveComplianceSchema.safeParse({ documentIds: ids });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    for (const documentId of parsed.data.documentIds) {
      const fd = new FormData();
      fd.set("documentId", documentId);
      await approveComplianceDoc(fd);
    }

    revalidatePath("/workers");
    return actionSuccess(
      { count: parsed.data.documentIds.length },
      `${parsed.data.documentIds.length} document(s) approved`
    );
  });
}

export async function archiveWorker(workerId: string) {
  return withPermission(PermissionKey.WORKER_ARCHIVE, async (ctx) => {
    if (!isSupabaseConfigured()) {
      revalidatePath("/workers");
      return actionSuccess(undefined, "Demo mode: worker archived.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("workers")
      .update({
        status: "archived",
        deleted_at: new Date().toISOString(),
        updated_by: ctx.user_id,
      })
      .eq("id", workerId)
      .eq("organization_id", ctx.organization_id);

    if (error) return actionError(error.message);

    revalidatePath("/workers");
    return actionSuccess(undefined, "Worker archived");
  });
}

export async function markComplianceExpired(
  workerId: string,
  docType: ComplianceDocType,
  expiryDate: string
) {
  return withPermission(PermissionKey.COMPLIANCE_APPROVE, async (ctx) => {
    await syncComplianceExpiryRule({
      organizationId: ctx.organization_id,
      workerId,
      docType,
      expiryDate,
      createdBy: ctx.user_id,
    });
    return actionSuccess();
  });
}

export async function addWorkerRule(formData: FormData) {
  return withPermission(PermissionKey.WORKER_EDIT, async (ctx) => {
    const parsed = workerRuleSchema.safeParse({
      workerId: formData.get("workerId"),
      conditionType: formData.get("conditionType"),
      message: formData.get("message"),
      severity: formData.get("severity") || "confirm",
    });

    if (!parsed.success) {
      return actionError("Invalid input", zodFieldErrors(parsed.error));
    }

    if (!isSupabaseConfigured()) {
      revalidatePath(`/workers/${parsed.data.workerId}`);
      return actionSuccess({ id: crypto.randomUUID() }, "Demo mode: rule added.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rules")
      .insert({
        organization_id: ctx.organization_id,
        entity_type: "worker",
        entity_id: parsed.data.workerId,
        condition: {
          type: parsed.data.conditionType,
        } as import("@/types/database").Json,
        severity: parsed.data.severity,
        message: parsed.data.message,
        requires_reason: parsed.data.severity === "confirm",
        is_active: true,
        created_by: ctx.user_id,
      })
      .select("id")
      .single();

    if (error) return actionError(error.message);

    revalidatePath(`/workers/${parsed.data.workerId}`);
    return actionSuccess({ id: data?.id ?? "" }, "Rule added");
  });
}

export async function removeWorkerRule(formData: FormData) {
  return withPermission(PermissionKey.WORKER_EDIT, async (ctx) => {
    const ruleId = formData.get("ruleId") as string;
    const workerId = formData.get("workerId") as string;

    if (!ruleId || !workerId) {
      return actionError("Rule ID and worker ID are required");
    }

    if (!isSupabaseConfigured()) {
      revalidatePath(`/workers/${workerId}`);
      return actionSuccess(undefined, "Demo mode: rule removed.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("rules")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_by: ctx.user_id,
      })
      .eq("id", ruleId)
      .eq("organization_id", ctx.organization_id)
      .eq("entity_type", "worker");

    if (error) return actionError(error.message);

    revalidatePath(`/workers/${workerId}`);
    return actionSuccess(undefined, "Rule removed");
  });
}
