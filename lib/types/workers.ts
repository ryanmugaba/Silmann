export const COMPLIANCE_DOC_TYPES = [
  "ndis_worker_screening",
  "first_aid_cpr",
  "wwcc",
  "drivers_license",
  "right_to_work",
  "vaccination",
  "vehicle_insurance",
  "manual_handling",
  "peg_feeding",
  "mental_health_first_aid",
  "other",
] as const;

export type ComplianceDocType = (typeof COMPLIANCE_DOC_TYPES)[number];

export const COMPLIANCE_DOC_LABELS: Record<ComplianceDocType, string> = {
  ndis_worker_screening: "NDIS Worker Screening",
  first_aid_cpr: "First Aid / CPR",
  wwcc: "Working With Children Check",
  drivers_license: "Driver's Licence",
  right_to_work: "Right to Work",
  vaccination: "Vaccination",
  vehicle_insurance: "Vehicle Insurance",
  manual_handling: "Manual Handling",
  peg_feeding: "PEG Feeding",
  mental_health_first_aid: "Mental Health First Aid",
  other: "Other",
};

export const MANDATORY_COMPLIANCE_DOCS: ComplianceDocType[] = [
  "ndis_worker_screening",
  "first_aid_cpr",
  "wwcc",
  "right_to_work",
];

export type ComplianceStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "expired";

export type WorkerComplianceSummary = "compliant" | "expiring" | "non_compliant";

export type WorkerListItem = {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  employmentType: string | null;
  status: string;
  houseNames: string[];
  complianceSummary: WorkerComplianceSummary;
  pendingDocCount: number;
};

export type PendingComplianceItem = ComplianceDocument & {
  workerName: string;
};

export type ComplianceDocument = {
  id: string;
  workerId: string;
  organizationId: string;
  docType: ComplianceDocType;
  docName: string;
  fileUrl: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  issuingBody: string | null;
  documentNumber: string | null;
  status: ComplianceStatus;
  rejectedReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  submittedAt: string;
};

export type WorkerDetail = WorkerListItem & {
  phone: string | null;
  schadsLevel: number | null;
  languages: string[];
  certificationsSummary: Record<string, unknown>;
  preferences: Record<string, unknown>;
  documents: ComplianceDocument[];
};
