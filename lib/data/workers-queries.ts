import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import { computeCountdownStatus } from "@/lib/primitives/countdown/compute";
import { DEFAULT_COMPLIANCE_DOC } from "@/lib/primitives/countdown/types";
import {
  getMockPendingCompliance,
  getMockWorkerDetail,
  MOCK_WORKERS,
} from "@/lib/data/mock-workers";
import type {
  ComplianceDocument,
  ComplianceStatus,
  PendingComplianceItem,
  WorkerComplianceSummary,
  WorkerDetail,
  WorkerListItem,
} from "@/lib/types/workers";
import type { ComplianceDocType } from "@/lib/types/workers";

function summariseCompliance(
  docs: Pick<ComplianceDocument, "status" | "expiryDate">[]
): { summary: WorkerComplianceSummary; pending: number } {
  let pending = 0;
  let hasExpired = false;
  let hasExpiring = false;

  for (const doc of docs) {
    if (doc.status === "pending_approval") pending++;
    if (doc.status === "expired" || doc.status === "rejected") {
      hasExpired = true;
      continue;
    }
    if (doc.expiryDate && doc.status === "approved") {
      const { severity } = computeCountdownStatus({
        expiry_date: doc.expiryDate,
        thresholds: DEFAULT_COMPLIANCE_DOC.thresholds,
        severity_per_threshold: DEFAULT_COMPLIANCE_DOC.severity_per_threshold,
        status: "active",
      });
      if (severity === "red") hasExpired = true;
      else if (severity === "amber") hasExpiring = true;
    }
  }

  const summary: WorkerComplianceSummary = hasExpired
    ? "non_compliant"
    : hasExpiring || pending > 0
      ? "expiring"
      : "compliant";

  return { summary, pending };
}

function mapComplianceRow(row: {
  id: string;
  worker_id: string;
  organization_id: string;
  doc_type: string;
  doc_name: string;
  file_url: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  issuing_body: string | null;
  document_number: string | null;
  status: string;
  rejected_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string;
}): ComplianceDocument {
  return {
    id: row.id,
    workerId: row.worker_id,
    organizationId: row.organization_id,
    docType: row.doc_type as ComplianceDocType,
    docName: row.doc_name,
    fileUrl: row.file_url,
    issuedDate: row.issued_date,
    expiryDate: row.expiry_date,
    issuingBody: row.issuing_body,
    documentNumber: row.document_number,
    status: row.status as ComplianceStatus,
    rejectedReason: row.rejected_reason,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    submittedAt: row.submitted_at,
  };
}

export async function listWorkers(
  organizationId: string
): Promise<{ workers: WorkerListItem[]; isMock: boolean }> {
  if (!isSupabaseConfigured()) {
    return { workers: MOCK_WORKERS, isMock: true };
  }

  const supabase = await createClient();

  const { data: workerRows, error } = await supabase
    .from("workers")
    .select(
      `
      id,
      worker_profile_id,
      employment_type,
      status,
      profiles!workers_worker_profile_id_fkey (
        full_name,
        email,
        avatar_url,
        role
      )
    `
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error || !workerRows?.length) {
    return { workers: MOCK_WORKERS, isMock: true };
  }

  const profileIds = workerRows.map(
    (w: { worker_profile_id: string }) => w.worker_profile_id
  );

  const { data: docs } = await supabase
    .from("compliance_documents")
    .select("worker_id, status, expiry_date")
    .in(
      "worker_id",
      workerRows.map((w: { id: string }) => w.id)
    )
    .is("deleted_at", null);

  const docsByWorker = new Map<string, ComplianceDocument[]>();
  for (const row of docs ?? []) {
    const list = docsByWorker.get(row.worker_id) ?? [];
    list.push(mapComplianceRow(row as Parameters<typeof mapComplianceRow>[0]));
    docsByWorker.set(row.worker_id, list);
  }

  const workers: WorkerListItem[] = workerRows.map((row: {
    id: string;
    worker_profile_id: string;
    employment_type: string | null;
    status: string;
    profiles: {
      full_name: string | null;
      email: string;
      avatar_url: string | null;
      role: string;
    } | null;
  }) => {
    const workerDocs = docsByWorker.get(row.id) ?? [];
    const { summary, pending } = summariseCompliance(workerDocs);
    return {
      id: row.id,
      profileId: row.worker_profile_id,
      fullName: row.profiles?.full_name ?? "Unknown",
      email: row.profiles?.email ?? "",
      avatarUrl: row.profiles?.avatar_url ?? null,
      role: row.profiles?.role ?? "support_worker",
      employmentType: row.employment_type,
      status: row.status,
      houseNames: [],
      complianceSummary: summary,
      pendingDocCount: pending,
    };
  });

  if (profileIds.length > 0) {
    const { data: assignments } = await supabase
      .from("house_assignments")
      .select("user_id, houses(name)")
      .in("user_id", profileIds)
      .returns<{ user_id: string; houses: { name: string } | null }[]>();

    const housesByProfile = new Map<string, string[]>();
    for (const a of assignments ?? []) {
      const houses = housesByProfile.get(a.user_id) ?? [];
      const name = a.houses?.name;
      if (name) houses.push(name);
      housesByProfile.set(a.user_id, houses);
    }

    for (const w of workers) {
      w.houseNames = housesByProfile.get(w.profileId) ?? [];
    }
  }

  return { workers, isMock: false };
}

export async function getWorkerById(
  id: string,
  organizationId: string
): Promise<{ worker: WorkerDetail | null; isMock: boolean }> {
  if (!isSupabaseConfigured()) {
    return { worker: getMockWorkerDetail(id), isMock: true };
  }

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("workers")
    .select(
      `
      id,
      worker_profile_id,
      employment_type,
      schads_level,
      languages,
      certifications_summary,
      preferences,
      status,
      profiles!workers_worker_profile_id_fkey (
        full_name,
        email,
        avatar_url,
        role,
        phone
      )
    `
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .single<{
      id: string;
      worker_profile_id: string;
      employment_type: string | null;
      schads_level: number | null;
      languages: string[] | null;
      certifications_summary: import("@/types/database").Json | null;
      preferences: import("@/types/database").Json | null;
      status: string;
      profiles: {
        full_name: string | null;
        email: string;
        avatar_url: string | null;
        role: string;
        phone: string | null;
      } | null;
    }>();

  if (error || !row) {
    return { worker: getMockWorkerDetail(id), isMock: true };
  }

  const { data: docRows } = await supabase
    .from("compliance_documents")
    .select("*")
    .eq("worker_id", id)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });

  const documents = (docRows ?? []).map((d) =>
    mapComplianceRow(d as Parameters<typeof mapComplianceRow>[0])
  );
  const { summary, pending } = summariseCompliance(documents);

  const profile = row.profiles;

  return {
    isMock: false,
    worker: {
      id: row.id,
      profileId: row.worker_profile_id,
      fullName: profile?.full_name ?? "Unknown",
      email: profile?.email ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      role: profile?.role ?? "support_worker",
      employmentType: row.employment_type,
      status: row.status,
      houseNames: [],
      complianceSummary: summary,
      pendingDocCount: pending,
      phone: profile?.phone ?? null,
      schadsLevel: row.schads_level,
      languages: row.languages ?? [],
      certificationsSummary:
        (row.certifications_summary as Record<string, unknown>) ?? {},
      preferences: (row.preferences as Record<string, unknown>) ?? {},
      documents,
    },
  };
}

export async function listPendingCompliance(
  organizationId: string
): Promise<{ documents: PendingComplianceItem[]; isMock: boolean }> {
  if (!isSupabaseConfigured()) {
    const docs = getMockPendingCompliance();
    const byWorker = new Map(MOCK_WORKERS.map((w) => [w.id, w.fullName]));
    return {
      documents: docs.map((d) => ({
        ...d,
        workerName: byWorker.get(d.workerId) ?? "Unknown worker",
      })),
      isMock: true,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compliance_documents")
    .select(
      `
      *,
      workers (
        id,
        profiles!workers_worker_profile_id_fkey ( full_name )
      )
    `
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending_approval")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: true });

  if (error || !data?.length) {
    const docs = getMockPendingCompliance();
    const byWorker = new Map(MOCK_WORKERS.map((w) => [w.id, w.fullName]));
    return {
      documents: docs.map((d) => ({
        ...d,
        workerName: byWorker.get(d.workerId) ?? "Unknown worker",
      })),
      isMock: true,
    };
  }

  type PendingComplianceRow = Parameters<typeof mapComplianceRow>[0] & {
    workers: { profiles: { full_name: string | null } | null } | null;
  };

  return {
    documents: (data as PendingComplianceRow[]).map((row) => {
      const doc = mapComplianceRow(row);
      return {
        ...doc,
        workerName: row.workers?.profiles?.full_name ?? "Unknown worker",
      };
    }),
    isMock: false,
  };
}

export async function listWorkerComplianceForProfile(
  profileId: string,
  organizationId: string
): Promise<{ documents: ComplianceDocument[]; workerId: string | null; isMock: boolean }> {
  if (!isSupabaseConfigured()) {
    const worker = MOCK_WORKERS.find((w) => w.profileId === profileId);
    const docs = worker
      ? getMockWorkerDetail(worker.id)?.documents ?? []
      : MOCK_WORKERS[0]
        ? getMockWorkerDetail(MOCK_WORKERS[0].id)?.documents ?? []
        : [];
    return {
      documents: docs,
      workerId: worker?.id ?? MOCK_WORKERS[0]?.id ?? null,
      isMock: true,
    };
  }

  const supabase = await createClient();
  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("worker_profile_id", profileId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!worker) {
    return { documents: [], workerId: null, isMock: false };
  }

  const { data } = await supabase
    .from("compliance_documents")
    .select("*")
    .eq("worker_id", worker.id)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });

  return {
    workerId: worker.id,
    documents: (data ?? []).map((d) =>
      mapComplianceRow(d as Parameters<typeof mapComplianceRow>[0])
    ),
    isMock: false,
  };
}
