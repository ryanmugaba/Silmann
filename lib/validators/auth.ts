import { z } from "zod";
import { ROLES } from "@/lib/primitives/rbac/types";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Full name is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const inviteAcceptSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const onboardingOrgSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  abn: z.string().optional(),
  ndisRegistrationNumber: z.string().optional(),
  timezone: z.string().default("Australia/Sydney"),
});

export const onboardingHouseSchema = z.object({
  name: z.string().min(2, "House name is required"),
  address: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z
    .string()
    .regex(/^\d{4}$/, "Enter a valid 4-digit postcode")
    .optional()
    .or(z.literal("")),
  maxResidents: z.coerce.number().int().positive().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleRego: z.string().optional(),
});

const inviteRoleSchema = z.enum([
  "team_leader",
  "roster_coordinator",
  "support_worker",
  "read_only",
] as const);

export const onboardingInviteRowSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: inviteRoleSchema,
});

export const onboardingInvitesSchema = z.object({
  invites: z.array(onboardingInviteRowSchema).max(10),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
export type OnboardingOrgInput = z.infer<typeof onboardingOrgSchema>;
export type OnboardingHouseInput = z.infer<typeof onboardingHouseSchema>;
export type OnboardingInvitesInput = z.infer<typeof onboardingInvitesSchema>;

export const INVITE_ROLES = ROLES.filter((r) => r !== "owner");
