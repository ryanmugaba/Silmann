"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeActionError } from "@/lib/errors/action-safe";
import { createServiceClient } from "@/lib/supabase/server";
import { withPermission } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { sendNotification } from "@/lib/primitives/notifications/send";
import type { Json } from "@/types/database";

type TargetAudienceInput = {
  roles?: string[];
  houses?: string[];
  userIds?: string[];
};

async function resolveAudienceUserIds(
  organizationId: string,
  audience: TargetAudienceInput
): Promise<string[]> {
  const supabase = createServiceClient();
  const hasFilter =
    (audience.roles?.length ?? 0) > 0 ||
    (audience.houses?.length ?? 0) > 0 ||
    (audience.userIds?.length ?? 0) > 0;

  if (!hasFilter) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .is("deleted_at", null);
    return (data ?? []).map((p) => p.id);
  }

  const ids = new Set<string>(audience.userIds ?? []);

  if (audience.roles?.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .in("role", audience.roles)
      .eq("is_active", true)
      .is("deleted_at", null);
    for (const p of data ?? []) ids.add(p.id);
  }

  if (audience.houses?.length) {
    const { data } = await supabase
      .from("house_assignments")
      .select("user_id")
      .in("house_id", audience.houses);
    for (const a of data ?? []) ids.add(a.user_id);
  }

  return Array.from(ids);
}

async function syncAnnouncementChannelMembers(
  channelId: string,
  userIds: string[]
) {
  const supabase = createServiceClient();
  if (userIds.length === 0) return;

  await supabase.from("channel_members").upsert(
    userIds.map((user_id) => ({ channel_id: channelId, user_id })),
    { onConflict: "channel_id,user_id", ignoreDuplicates: true }
  );
}

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  category: z.string(),
  priority: z.enum(["standard", "urgent"]),
  requiresAcknowledgment: z.boolean(),
  pinned: z.boolean(),
  targetAudience: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function createAnnouncement(
  input: z.infer<typeof createAnnouncementSchema>
) {
  const parsed = createAnnouncementSchema.parse(input);

  return withPermission(PermissionKey.NOTICE_BOARD_POST, async (ctx) => {
    let audience = (parsed.targetAudience ?? {}) as TargetAudienceInput;
    const hasAudienceFilter =
      (audience.roles?.length ?? 0) > 0 ||
      (audience.houses?.length ?? 0) > 0 ||
      (audience.userIds?.length ?? 0) > 0;
    if (ctx.role !== "owner" && ctx.house_ids.length > 0 && !hasAudienceFilter) {
      audience = { ...audience, houses: ctx.house_ids };
    }
    const requestedHouses = audience.houses ?? [];
    if (
      ctx.role !== "owner" &&
      ctx.house_ids.length > 0 &&
      requestedHouses.some((houseId) => !ctx.house_ids.includes(houseId))
    ) {
      return { error: "You do not have access to one or more target houses" };
    }

    const supabase = await createClient();

    const { data: channel } = await supabase
      .from("channels")
      .select("id")
      .eq("organization_id", ctx.organization_id)
      .eq("channel_type", "announcement")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle<{ id: string }>();

    let channelId = channel?.id;

    if (!channelId) {
      const { data: newChannel, error: chError } = await supabase
        .from("channels")
        .insert({
          organization_id: ctx.organization_id,
          name: "Notice Board",
          channel_type: "announcement",
          is_post_only: true,
          created_by: ctx.user_id,
        })
        .select("id")
        .single<{ id: string }>();

      if (chError || !newChannel) {
        return { error: chError?.message ?? "Failed to create announcement channel" };
      }
      channelId = newChannel.id;
    }

    // Poster must be a channel member before insert (RLS checks membership)
    await syncAnnouncementChannelMembers(channelId, [ctx.user_id]);

    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        channel_id: channelId,
        organization_id: ctx.organization_id,
        user_id: ctx.user_id,
        content: parsed.content,
      })
      .select("id")
      .single<{ id: string }>();

    if (msgError || !message) {
      return { error: msgError?.message ?? "Failed to create message" };
    }

    const { error: annError } = await supabase.from("announcements").insert({
      organization_id: ctx.organization_id,
      channel_id: channelId,
      message_id: message.id,
      title: parsed.title,
      priority: parsed.priority,
      category: parsed.category,
      target_audience: audience as Json,
      requires_acknowledgment: parsed.requiresAcknowledgment,
      pinned: parsed.pinned,
      scheduled_for: parsed.scheduledFor ?? null,
      expires_at: parsed.expiresAt ?? null,
      created_by: ctx.user_id,
    });

    if (annError) {
      return { error: annError.message };
    }

    const recipientIds = await resolveAudienceUserIds(
      ctx.organization_id,
      audience
    );
    await syncAnnouncementChannelMembers(channelId, recipientIds);

    if (!parsed.scheduledFor) {
      await sendNotification({
        organization_id: ctx.organization_id,
        user_ids: recipientIds,
        type: "message_in_channel",
        title: `New notice: ${parsed.title}`,
        body: parsed.content.slice(0, 200),
        action_url: "/notice-board",
      });
    }

    revalidatePath("/notice-board");
    return { success: true };
  });
}

export async function acknowledgeAnnouncement(announcementId: string) {
  return withPermission(PermissionKey.NOTICE_BOARD_VIEW, async (ctx) => {
    const supabase = await createClient();

    const { error } = await supabase.from("announcement_acknowledgments").upsert(
      {
        announcement_id: announcementId,
        user_id: ctx.user_id,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: "announcement_id,user_id" }
    );

    if (error) {
      return { error: safeActionError(error, "notice-board") };
    }

    revalidatePath("/notice-board");
    return { success: true };
  });
}
