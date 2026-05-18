import { addDays, setHours, setMinutes } from "date-fns";
import type { ShiftRecord, WorkerAvailabilityCell } from "@/lib/types/roster";
import { MOCK_HOUSE_1, MOCK_HOUSE_2, MOCK_ORG } from "@/lib/data/mock-workers";

function shiftAt(
  id: string,
  dayOffset: number,
  startH: number,
  endH: number,
  opts: Partial<ShiftRecord> & Pick<ShiftRecord, "status" | "houseId" | "houseName">
): ShiftRecord {
  const base = addDays(new Date(), dayOffset);
  const start = setMinutes(setHours(base, startH), 0);
  const end = setMinutes(setHours(base, endH), 0);
  return {
    id,
    organizationId: MOCK_ORG,
    houseId: opts.houseId,
    houseName: opts.houseName,
    participantId: opts.participantId ?? "part-1",
    participantName: opts.participantName ?? "Alex Morgan",
    workerId: opts.workerId ?? null,
    workerName: opts.workerName ?? null,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    shiftType: opts.shiftType ?? "day",
    status: opts.status,
    ratio: opts.ratio ?? "1:1",
    notes: opts.notes ?? null,
  };
}

export const MOCK_SHIFTS: ShiftRecord[] = [
  shiftAt("s1", 0, 7, 15, {
    status: "confirmed",
    houseId: MOCK_HOUSE_1,
    houseName: "Parramatta SIL",
    workerId: "p1",
    workerName: "Sarah Chen",
  }),
  shiftAt("s2", 0, 15, 23, {
    status: "unfilled",
    houseId: MOCK_HOUSE_1,
    houseName: "Parramatta SIL",
    shiftType: "afternoon",
  }),
  shiftAt("s3", 1, 7, 15, {
    status: "offered",
    houseId: MOCK_HOUSE_2,
    houseName: "Blacktown SIL",
    workerId: "p2",
    workerName: "James O'Brien",
  }),
  shiftAt("s4", 2, 22, 7, {
    status: "confirmed",
    houseId: MOCK_HOUSE_1,
    houseName: "Parramatta SIL",
    shiftType: "sleepover",
    workerId: "p1",
    workerName: "Sarah Chen",
    participantName: "House — sleepover",
    participantId: null,
  }),
  shiftAt("s5", 3, 9, 17, {
    status: "swap_pending",
    houseId: MOCK_HOUSE_2,
    houseName: "Blacktown SIL",
    workerId: "p2",
    workerName: "James O'Brien",
    shiftType: "community_access",
  }),
  shiftAt("s6", 5, 7, 15, {
    status: "unfilled",
    houseId: MOCK_HOUSE_1,
    houseName: "Parramatta SIL",
  }),
];

export function getMockShiftsInRange(
  start: Date,
  end: Date
): ShiftRecord[] {
  return MOCK_SHIFTS.filter((s) => {
    const t = new Date(s.startAt).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

export function getMockAvailabilityGrid(): WorkerAvailabilityCell[] {
  const workers = [
    { id: "p1", name: "Sarah Chen" },
    { id: "p2", name: "James O'Brien" },
    { id: "p3", name: "Amelia Torres" },
  ];
  const cells: WorkerAvailabilityCell[] = [];
  const statuses: Array<"available" | "preferred" | "unavailable" | null> = [
    "available",
    "preferred",
    "unavailable",
    null,
  ];

  for (let d = 0; d < 14; d++) {
    const date = addDays(new Date(), d).toISOString().slice(0, 10);
    workers.forEach((w, wi) => {
      cells.push({
        workerId: w.id,
        workerName: w.name,
        date,
        status: statuses[(d + wi) % statuses.length],
        hasShift: d % 5 === wi,
        locked: d < 2,
      });
    });
  }
  return cells;
}
