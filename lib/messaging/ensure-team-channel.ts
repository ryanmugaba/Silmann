import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/configured";

const TEAM_CHANNEL_NAME = "Team";

/**
 * Ensures the org has a shared Team channel and the user is a member.
 * Uses service role so support workers can join without RLS edge cases on new DMs.
 */
export async function ensureOrgTeamChannel(
  organizationId: string,
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const service = createServiceClient();

  const { data: existing } = await service
    .from("channels")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("channel_type", "topic_channel")
    .eq("name", TEAM_CHANNEL_NAME)
    .is("archived_at", null)
    .maybeSingle<{ id: string }>();

  let channelId = existing?.id;

  if (!channelId) {
    const { data: created, error } = await service
      .from("channels")
      .insert({
        organization_id: organizationId,
        name: TEAM_CHANNEL_NAME,
        channel_type: "topic_channel",
        created_by: userId,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !created) return null;
    channelId = created.id;
  }

  const { data: member } = await service
    .from("channel_members")
    .select("id")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) {
    await service.from("channel_members").insert({
      channel_id: channelId,
      user_id: userId,
    });
  }

  const { data: orgProfiles } = await service
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  const inserts = (orgProfiles ?? [])
    .filter((p) => p.id !== userId)
    .map((p) => ({ channel_id: channelId!, user_id: p.id }));

  for (const row of inserts) {
    await service.from("channel_members").upsert(row, {
      onConflict: "channel_id,user_id",
      ignoreDuplicates: true,
    });
  }

  return channelId;
}
