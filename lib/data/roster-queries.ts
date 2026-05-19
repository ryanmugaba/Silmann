import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, shouldUseMockData } from "@/lib/supabase/configured";
import {
  getMockAvailabilityGrid,
  getMockShiftsInRange,
  MOCK_SHIFTS,
} from "@/lib/data/mock-roster";
import type { ShiftRecord, ShiftStatus, ShiftType, WorkerAvailabilityCell } from "@/lib/types/roster";

function mapShiftRow(row: {
  id: string;
  organization_id: string;
  house_id: string;
  participant_id: string | null;
  worker_id: string | null;
  start_at: string;
  end_at: string;
  shift_type: string;
  status: string;
  ratio: string;
  notes: string | null;
  houses?: { name: string } | null;
  participants?: { full_name: string } | null;
  profiles?: { full_name: string } | null;
}): ShiftRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    houseId: row.house_id,
    houseName: row.houses?.name ?? "House",
    participantId: row.participant_id,
    participantName: row.participants?.full_name ?? null,
    workerId: row.worker_id,
    workerName: row.profiles?.full_name ?? null,
    startAt: row.start_at,
    endAt: row.end_at,
    shiftType: row.shift_type as ShiftType,
    status: row.status as ShiftStatus,
    ratio: row.ratio,
    notes: row.notes,
  };
}

export async function listShiftsInRange(
  organizationId: string,
  rangeStart: string,
  rangeEnd: string,
  filters?: { houseId?: string; status?: ShiftStatus }
): Promise<{ shifts: ShiftRecord[]; isMock: boolean }> {
  if (!isSupabaseConfigured()) {
    return shouldUseMockData()
      ? {
          shifts: getMockShiftsInRange(new Date(rangeStart), new Date(rangeEnd)),
          isMock: true,
        }
      : { shifts: [], isMock: false };
  }

  const supabase = await createClient();
  let query = supabase
    .from("shifts")
    .select(
      `
      *,
      houses ( name ),
      participants ( full_name ),
      profiles ( full_name )
    `
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("start_at", rangeStart)
    .lte("start_at", rangeEnd);

  if (filters?.houseId) {
    query = query.eq("house_id", filters.houseId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order("start_at");

  if (error) {
    return { shifts: [], isMock: false };
  }

  return {
    shifts: data.map((row) => mapShiftRow(row as Parameters<typeof mapShiftRow>[0])),
    isMock: false,
  };
}

export async function getShiftById(
  shiftId: string,
  organizationId: string
): Promise<{ shift: ShiftRecord | null; isMock: boolean }> {
  if (!isSupabaseConfigured()) {
    const shift = MOCK_SHIFTS.find((s) => s.id === shiftId) ?? null;
    return { shift, isMock: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select(
      `
      *,
      houses ( name ),
      participants ( full_name ),
      profiles ( full_name )
    `
    )
    .eq("id", shiftId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    const shift = MOCK_SHIFTS.find((s) => s.id === shiftId) ?? null;
    return { shift, isMock: true };
  }

  return {
    shift: mapShiftRow(data as Parameters<typeof mapShiftRow>[0]),
    isMock: false,
  };
}

export async function getAvailabilityGrid(
  organizationId: string,
  _houseId?: string
): Promise<{ cells: WorkerAvailabilityCell[]; isMock: boolean }> {
  if (!isSupabaseConfigured()) {
    return { cells: getMockAvailabilityGrid(), isMock: true };
  }

  const supabase = await createClient();
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);

  const { data, error } = await supabase
    .from("worker_availability")
    .select("worker_id, date, status, locked_at, profiles(full_name)")
    .eq("organization_id", organizationId)
    .gte("date", start.toISOString().slice(0, 10))
    .lte("date", end.toISOString().slice(0, 10));

  if (error || !data?.length) {
    return { cells: getMockAvailabilityGrid(), isMock: true };
  }

  const cells: WorkerAvailabilityCell[] = data.map((row: {
    worker_id: string;
    date: string;
    status: string;
    locked_at: string | null;
    profiles: { full_name: string } | null;
  }) => ({
    workerId: row.worker_id,
    workerName: row.profiles?.full_name ?? "Worker",
    date: row.date,
    status: row.status as WorkerAvailabilityCell["status"],
    hasShift: false,
    locked: Boolean(row.locked_at),
  }));

  return { cells, isMock: false };
}

export async function getWorkerAvailability(
  workerId: string,
  organizationId: string
): Promise<{
  cells: Array<{ date: string; status: WorkerAvailabilityCell["status"] }>;
  lockedDates: string[];
  isMock: boolean;
}> {
  if (!isSupabaseConfigured()) {
    const mock = getMockAvailabilityGrid().filter((c) => c.workerId === workerId);
    return {
      cells: mock.map((c) => ({ date: c.date, status: c.status })),
      lockedDates: mock.filter((c) => c.locked).map((c) => c.date),
      isMock: true,
    };
  }

  const supabase = await createClient();
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 28);

  const { data } = await supabase
    .from("worker_availability")
    .select("date, status, locked_at")
    .eq("organization_id", organizationId)
    .eq("worker_id", workerId)
    .gte("date", start.toISOString().slice(0, 10))
    .lte("date", end.toISOString().slice(0, 10));

  return {
    cells: (data ?? []).map((r: { date: string; status: string }) => ({
      date: r.date,
      status: r.status as WorkerAvailabilityCell["status"],
    })),
    lockedDates: (data ?? [])
      .filter((r: { locked_at: string | null }) => r.locked_at)
      .map((r: { date: string }) => r.date),
    isMock: false,
  };
}
