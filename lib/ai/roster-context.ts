import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import { MOCK_HOUSES, MOCK_PARTICIPANTS } from "@/lib/data/mock-participants";
import { MOCK_WORKERS } from "@/lib/data/mock-workers";
import type { PermissionContext } from "@/lib/primitives/rbac/types";

export type RosterCommandContext = {
  today: string;
  timezone: string;
  houses: Array<{ id: string; name: string }>;
  workers: Array<{
    id: string;
    name: string;
    email: string | null;
    house_ids: string[];
    house_names: string[];
  }>;
  participants: Array<{
    id: string;
    name: string;
    preferred_name: string | null;
    house_id: string;
    house_name: string;
  }>;
  shift_presets: Array<{
    shift_type: string;
    label: string;
    start_time: string;
    end_time: string;
    ends_next_day?: boolean;
  }>;
  guidance: string[];
  isMock: boolean;
};

const SHIFT_PRESETS = [
  { shift_type: "day", label: "Day", start_time: "07:00", end_time: "15:00" },
  {
    shift_type: "afternoon",
    label: "Afternoon",
    start_time: "15:00",
    end_time: "23:00",
  },
  {
    shift_type: "evening",
    label: "Evening",
    start_time: "16:00",
    end_time: "22:00",
  },
  {
    shift_type: "sleepover",
    label: "Sleepover",
    start_time: "22:00",
    end_time: "07:00",
    ends_next_day: true,
  },
  {
    shift_type: "active_overnight",
    label: "Active overnight",
    start_time: "22:00",
    end_time: "06:00",
    ends_next_day: true,
  },
  {
    shift_type: "community_access",
    label: "Community access",
    start_time: "09:00",
    end_time: "17:00",
  },
  {
    shift_type: "transport",
    label: "Transport",
    start_time: "09:00",
    end_time: "12:00",
  },
  {
    shift_type: "broken_shift",
    label: "Broken shift",
    start_time: "07:00",
    end_time: "10:00",
  },
] as const;

function todayInSydney(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function scopedHouses<T extends { id: string }>(
  houses: T[],
  ctx: PermissionContext
): T[] {
  if (ctx.role === "owner" || ctx.house_ids.length === 0) {
    return houses;
  }
  const allowed = new Set(ctx.house_ids);
  return houses.filter((house) => allowed.has(house.id));
}

export async function getRosterCommandContext(
  ctx: PermissionContext
): Promise<RosterCommandContext> {
  const guidance = [
    "Use exact IDs from this context when calling create_shift.",
    "If the user gives a date without a time, use the day preset and say you used the default 07:00-15:00 day shift.",
    "If more than one house or participant could match, ask one short clarification before creating.",
    "Never invent worker, house, or participant IDs.",
  ];

  if (!isSupabaseConfigured()) {
    const houses = scopedHouses(MOCK_HOUSES, ctx);
    const houseByName = new Map(houses.map((house) => [house.name, house.id]));

    return {
      today: todayInSydney(),
      timezone: "Australia/Sydney",
      houses,
      workers: MOCK_WORKERS.map((worker) => ({
        id: worker.profileId,
        name: worker.fullName,
        email: worker.email,
        house_ids: worker.houseNames
          .map((name) => houseByName.get(name))
          .filter((id): id is string => Boolean(id)),
        house_names: worker.houseNames,
      })).filter((worker) => {
        if (ctx.role === "owner" || ctx.house_ids.length === 0) return true;
        return worker.house_ids.some((id) => ctx.house_ids.includes(id));
      }),
      participants: MOCK_PARTICIPANTS.filter((participant) =>
        houses.some((house) => house.id === participant.house_id)
      ).map((participant) => ({
        id: participant.id,
        name: participant.full_name,
        preferred_name: participant.preferred_name,
        house_id: participant.house_id,
        house_name: participant.house_name,
      })),
      shift_presets: [...SHIFT_PRESETS],
      guidance,
      isMock: true,
    };
  }

  const supabase = await createClient();
  const { data: houseRows } = await supabase
    .from("houses")
    .select("id, name")
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .order("name")
    .returns<Array<{ id: string; name: string }>>();

  const houses = scopedHouses(houseRows ?? [], ctx);
  const houseIds = houses.map((house) => house.id);
  const houseNames = new Map(houses.map((house) => [house.id, house.name]));

  if (houseIds.length === 0) {
    return {
      today: todayInSydney(),
      timezone: "Australia/Sydney",
      houses: [],
      workers: [],
      participants: [],
      shift_presets: [...SHIFT_PRESETS],
      guidance,
      isMock: false,
    };
  }

  const { data: assignments } = await supabase
    .from("house_assignments")
    .select("user_id, house_id")
    .in("house_id", houseIds)
    .returns<Array<{ user_id: string; house_id: string }>>();

  const workerHouseIds = new Map<string, Set<string>>();
  for (const assignment of assignments ?? []) {
    const current = workerHouseIds.get(assignment.user_id) ?? new Set<string>();
    current.add(assignment.house_id);
    workerHouseIds.set(assignment.user_id, current);
  }

  const workerIds = Array.from(workerHouseIds.keys());
  const { data: profileRows } = workerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("organization_id", ctx.organization_id)
        .eq("role", "support_worker")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("id", workerIds)
        .order("full_name")
        .returns<Array<{ id: string; full_name: string | null; email: string }>>()
    : { data: [] };

  const { data: participantRows } = await supabase
    .from("participants")
    .select("id, full_name, preferred_name, house_id")
    .eq("organization_id", ctx.organization_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .in("house_id", houseIds)
    .order("full_name")
    .returns<
      Array<{
        id: string;
        full_name: string;
        preferred_name: string | null;
        house_id: string;
      }>
    >();

  return {
    today: todayInSydney(),
    timezone: "Australia/Sydney",
    houses,
    workers: (profileRows ?? []).map((profile) => {
      const ids = Array.from(workerHouseIds.get(profile.id) ?? []);
      return {
        id: profile.id,
        name: profile.full_name ?? profile.email,
        email: profile.email,
        house_ids: ids,
        house_names: ids.map((id) => houseNames.get(id) ?? "House"),
      };
    }),
    participants: (participantRows ?? []).map((participant) => ({
      id: participant.id,
      name: participant.full_name,
      preferred_name: participant.preferred_name,
      house_id: participant.house_id,
      house_name: houseNames.get(participant.house_id) ?? "House",
    })),
    shift_presets: [...SHIFT_PRESETS],
    guidance,
    isMock: false,
  };
}
