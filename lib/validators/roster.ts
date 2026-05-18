import { z } from "zod";
import { SHIFT_TYPES } from "@/lib/types/roster";

export const createShiftSchema = z
  .object({
    houseId: z.string().uuid(),
    participantId: z.string().uuid().nullable().optional(),
    workerId: z.string().uuid().nullable().optional(),
    startAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
    endAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
    shiftType: z.enum(SHIFT_TYPES),
    ratio: z.string().default("1:1"),
    notes: z.string().max(2000).optional(),
    overrideReason: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.endAt).getTime() > new Date(data.startAt).getTime(),
    { message: "End time must be after start time", path: ["endAt"] }
  );

export const updateShiftSchema = z.object({
  shiftId: z.string().uuid(),
  houseId: z.string().uuid().optional(),
  participantId: z.string().uuid().nullable().optional(),
  workerId: z.string().uuid().nullable().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  shiftType: z.enum(SHIFT_TYPES).optional(),
  ratio: z.string().optional(),
  notes: z.string().max(2000).optional(),
  overrideReason: z.string().optional(),
});

export const updateShiftTimesSchema = z.object({
  shiftId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
  overrideReason: z.string().optional(),
});

export const cancelShiftSchema = z.object({
  shiftId: z.string().uuid(),
  reason: z.string().min(3).optional(),
});

export const availabilityCellSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["available", "preferred", "unavailable"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});

export const submitAvailabilitySchema = z.object({
  cells: z.array(availabilityCellSchema),
});

export const shiftSwapRequestSchema = z.object({
  shiftId: z.string().uuid(),
  targetWorkerId: z.string().uuid().optional(),
  reason: z.string().min(3, "Please provide a reason"),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type SubmitAvailabilityInput = z.infer<typeof submitAvailabilitySchema>;
