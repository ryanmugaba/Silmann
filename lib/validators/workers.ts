import { z } from "zod";
import { COMPLIANCE_DOC_TYPES } from "@/lib/types/workers";

export const inviteWorkerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  employmentType: z.enum(["casual", "part_time", "full_time"]).optional(),
  houseIds: z.array(z.string().uuid()).min(1, "Assign at least one house"),
});

export const updateWorkerSchema = z.object({
  workerId: z.string().uuid(),
  employmentType: z.enum(["casual", "part_time", "full_time"]).optional(),
  schadsLevel: z.coerce.number().int().min(1).max(8).optional(),
  languages: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive", "archived", "onboarding"]).optional(),
  phone: z.string().optional(),
});

export const submitComplianceDocSchema = z.object({
  workerId: z.string().uuid(),
  docType: z.enum(COMPLIANCE_DOC_TYPES),
  docName: z.string().min(1, "Document name is required"),
  fileUrl: z.string().url().optional().or(z.literal("")),
  issuedDate: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required"),
  issuingBody: z.string().optional(),
  documentNumber: z.string().optional(),
});

export const approveComplianceDocSchema = z.object({
  documentId: z.string().uuid(),
});

export const rejectComplianceDocSchema = z.object({
  documentId: z.string().uuid(),
  rejectedReason: z.string().min(3, "Please provide a rejection reason"),
});

export const bulkApproveComplianceSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
});

export const workerOnboardingPersonalSchema = z.object({
  phone: z.string().min(8, "Phone number is required"),
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(8, "Emergency contact phone is required"),
  emergencyContactRelation: z.string().optional(),
});

export const workerOnboardingBankSchema = z.object({
  bsb: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit BSB").optional(),
  accountNumber: z.string().min(6).optional(),
  superFundName: z.string().optional(),
  superMemberNumber: z.string().optional(),
  skipBank: z.boolean().optional(),
});

export const workerRuleSchema = z.object({
  workerId: z.string().uuid(),
  conditionType: z.string().min(1),
  message: z.string().min(3),
  severity: z.enum(["block", "confirm", "inform"]).default("confirm"),
});

export type InviteWorkerInput = z.infer<typeof inviteWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type SubmitComplianceDocInput = z.infer<typeof submitComplianceDocSchema>;
