import { z } from "zod";
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
} from "@/types/incidents";

export const createIncidentSchema = z.object({
  title: z.string().min(3, "Title is required").max(200),
  description: z.string().min(10, "Please describe what happened").max(10000),
  incident_type: z.enum(INCIDENT_TYPES),
  severity: z.enum(INCIDENT_SEVERITIES),
  occurred_at: z.string().datetime(),
  house_id: z.string().uuid().optional().nullable(),
  participant_id: z.string().uuid().optional().nullable(),
  immediate_actions: z.string().max(5000).optional(),
});

export const updateIncidentSchema = z.object({
  incident_id: z.string().uuid(),
  status: z.enum(INCIDENT_STATUSES).optional(),
  follow_up_notes: z.string().max(10000).optional(),
  immediate_actions: z.string().max(5000).optional(),
});

export const closeIncidentSchema = z.object({
  incident_id: z.string().uuid(),
  follow_up_notes: z.string().min(3, "Add closing notes for the register").max(10000),
});
