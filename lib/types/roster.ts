export const SHIFT_TYPES = [
  "day",
  "afternoon",
  "evening",
  "sleepover",
  "active_overnight",
  "community_access",
  "transport",
  "broken_shift",
] as const;

export type ShiftType = (typeof SHIFT_TYPES)[number];

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day: "Day",
  afternoon: "Afternoon",
  evening: "Evening",
  sleepover: "Sleepover",
  active_overnight: "Active Overnight",
  community_access: "Community Access",
  transport: "Transport",
  broken_shift: "Broken Shift",
};

export const SHIFT_STATUSES = [
  "unfilled",
  "offered",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "swap_pending",
] as const;

export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const SHIFT_STATUS_COLORS: Record<ShiftStatus, string> = {
  unfilled: "#ef4444",
  offered: "#f59e0b",
  confirmed: "#22c55e",
  in_progress: "#3b82f6",
  completed: "#9ca3af",
  cancelled: "#6b7280",
  swap_pending: "#a855f7",
};

export type ShiftRecord = {
  id: string;
  organizationId: string;
  houseId: string;
  houseName: string;
  participantId: string | null;
  participantName: string | null;
  workerId: string | null;
  workerName: string | null;
  startAt: string;
  endAt: string;
  shiftType: ShiftType;
  status: ShiftStatus;
  ratio: string;
  notes: string | null;
};

export type AvailabilityStatus = "available" | "preferred" | "unavailable";

export type WorkerAvailabilityCell = {
  workerId: string;
  workerName: string;
  date: string;
  status: AvailabilityStatus | null;
  hasShift: boolean;
  locked: boolean;
};
