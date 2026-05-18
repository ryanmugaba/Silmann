import type { SupabaseClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import type { PermissionContext } from "@/lib/primitives/rbac/types";

type ShiftRow = {
  id: string;
  house_id: string;
  start_at: string;
  worker_id: string | null;
  houses: { name: string } | null;
};

/** Get or create a topic channel scoped to a single shift. */
export async function getOrCreateShiftChannel(
  supabase: SupabaseClient,
  ctx: PermissionContext,
  shiftId: string
): Promise<{ channelId: string } | { error: string }> {
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select("id, house_id, start_at, worker_id, houses(name)")
    .eq("id", shiftId)
    .eq("organization_id", ctx.organization_id)
    .single<ShiftRow>();

  if (shiftError || !shift) {
    return { error: "Shift not found" };
  }

  if (ctx.house_ids.length > 0 && !ctx.house_ids.includes(shift.house_id)) {
    return { error: "You do not have access to this shift" };
  }

  const channelName = `Shift ${format(parseISO(shift.start_at), "yyyy-MM-dd")} ${shift.houses?.name ?? "House"}`;

  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("shift_id", shiftId)
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    return { channelId: existing.id };
  }

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .insert({
      organization_id: ctx.organization_id,
      name: channelName,
      channel_type: "topic_channel",
      house_id: shift.house_id,
      shift_id: shiftId,
      created_by: ctx.user_id,
    })
    .select("id")
    .single<{ id: string }>();

  if (channelError || !channel) {
    return { error: channelError?.message ?? "Could not create shift channel" };
  }

  const memberIds = new Set<string>([ctx.user_id]);
  if (shift.worker_id) {
    memberIds.add(shift.worker_id);
  }

  const { data: houseLeaders } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", ctx.organization_id)
    .in("role", ["owner", "team_leader", "roster_coordinator"]);

  for (const p of houseLeaders ?? []) {
    memberIds.add(p.id);
  }

  await supabase.from("channel_members").upsert(
    Array.from(memberIds).map((user_id) => ({
      channel_id: channel.id,
      user_id,
    })),
    { onConflict: "channel_id,user_id", ignoreDuplicates: true }
  );

  return { channelId: channel.id };
}
