import { z } from "zod";

export const participantStatusSchema = z.enum([
  "active",
  "inactive",
  "archived",
]);

export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export const gpDetailsSchema = z.object({
  name: z.string().optional(),
  clinic: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const goalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  description: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "achieved"]).optional(),
});

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .optional()
  .or(z.literal(""));

export const createParticipantStep1Schema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  preferred_name: z.string().optional(),
  date_of_birth: optionalDate,
  ndis_number: z
    .string()
    .min(9, "NDIS number must be at least 9 characters")
    .max(15, "NDIS number is too long"),
  gender: z.string().optional(),
  primary_language: z.string().optional(),
  secondary_languages: z.array(z.string()).default([]),
  cultural_background: z.string().optional(),
  photo_url: z.string().url().optional().or(z.literal("")),
});

export const createParticipantStep2Schema = z.object({
  house_id: z.string().uuid("Select a house"),
  plan_start_date: optionalDate,
  plan_end_date: optionalDate,
  plan_total_budget: z.coerce.number().nonnegative().optional(),
  plan_budget_by_category: z.record(z.coerce.number().nonnegative()).default({}),
});

export const createParticipantStep3Schema = z.object({
  goals: z.array(goalSchema).default([]),
  dietary: z.record(z.unknown()).default({}),
  preferences: z.record(z.unknown()).default({}),
});

export const createParticipantStep4Schema = z.object({
  has_vehicle_access: z.boolean().default(false),
  mobility_aids: z.array(z.string()).default([]),
  communication_methods: z.array(z.string()).default([]),
  behaviour_support_plan_url: z.string().url().optional().or(z.literal("")),
});

export const createParticipantStep5Schema = z.object({
  emergency_contacts: z
    .array(emergencyContactSchema)
    .min(1, "At least one emergency contact is required"),
  gp_details: gpDetailsSchema.default({}),
});

export const createParticipantSchema = createParticipantStep1Schema
  .merge(createParticipantStep2Schema)
  .merge(createParticipantStep3Schema)
  .merge(createParticipantStep4Schema)
  .merge(createParticipantStep5Schema);

export const updateParticipantSchema = createParticipantSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    status: participantStatusSchema.optional(),
  });

export const medicationTypeSchema = z.enum(["prn", "webster_pak"]);

export const addMedicationSchema = z.object({
  participant_id: z.string().uuid(),
  drug_name: z.string().min(1, "Drug name is required"),
  strength: z.string().optional(),
  form: z.string().optional(),
  prescriber: z.string().optional(),
  script_date: optionalDate,
  expiry_date: optionalDate,
  indication: z.string().optional(),
  max_dose_per_24h: z.string().optional(),
  min_interval_hours: z.coerce.number().positive().optional(),
  photo_url: z.string().url().optional().or(z.literal("")),
  storage_location: z.string().optional(),
  stock_count: z.coerce.number().int().nonnegative().optional(),
  type: medicationTypeSchema.default("prn"),
  webster_pak_pharmacy_name: z.string().optional(),
  webster_pak_collection_day: z.string().optional(),
});

export const ceaseMedicationSchema = z.object({
  medication_id: z.string().uuid(),
  participant_id: z.string().uuid(),
});

export const logPrnAdministrationSchema = z.object({
  participant_id: z.string().uuid(),
  medication_id: z.string().uuid(),
  administered_at: z.string().datetime({ message: "Invalid administration time" }),
  dose_given: z.string().min(1, "Dose is required"),
  reason: z.string().min(1, "Reason is required"),
  effect_30min_followup: z.string().optional(),
  notes: z.string().optional(),
});

export const participantRuleTypeSchema = z.enum([
  "no_vehicle",
  "gender_restriction",
  "restricted_pairing",
  "language_required",
]);

export const addParticipantRuleSchema = z
  .object({
    participant_id: z.string().uuid(),
    house_id: z.string().uuid().optional(),
    rule_type: participantRuleTypeSchema,
    not_gender: z.string().optional(),
    worker_id: z.string().uuid().optional(),
    language: z.string().optional(),
    message: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.rule_type === "gender_restriction" && !data.not_gender?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gender preference is required",
        path: ["not_gender"],
      });
    }
    if (data.rule_type === "restricted_pairing" && !data.worker_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Worker is required for restricted pairing",
        path: ["worker_id"],
      });
    }
    if (data.rule_type === "language_required" && !data.language?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Language is required",
        path: ["language"],
      });
    }
  });

export const removeParticipantRuleSchema = z.object({
  rule_id: z.string().uuid(),
  participant_id: z.string().uuid(),
});

export const archiveParticipantSchema = z.object({
  id: z.string().uuid(),
});

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;
export type AddMedicationInput = z.infer<typeof addMedicationSchema>;
export type LogPrnAdministrationInput = z.infer<typeof logPrnAdministrationSchema>;
export type AddParticipantRuleInput = z.infer<typeof addParticipantRuleSchema>;
