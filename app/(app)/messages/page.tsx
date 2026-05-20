import { redirect } from "next/navigation";
import { MessagesView } from "@/components/messaging/messages-view";
import { ensureOrgTeamChannel } from "@/lib/messaging/ensure-team-channel";
import { getPermissionContext, can } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import { mapRawMessage, type RawMessageRow } from "@/lib/messaging/message-mapper";
import type { ChannelWithMeta, MessageWithAuthor } from "@/types/messaging";

export const metadata = {
  title: "Messages — Silman",
};

export default async function MessagesPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.MESSAGE_VIEW)) {
    redirect("/dashboard");
  }

  await ensureOrgTeamChannel(ctx.organization_id, ctx.user_id);

  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("channel_members")
    .select(
      `
      channel_id,
      last_read_at,
      channels (
        id, organization_id, name, channel_type, house_id, is_post_only, created_at, archived_at, shift_id
      )
    `
    )
    .eq("user_id", ctx.user_id);

  type MembershipRow = {
    channel_id: string;
    last_read_at: string | null;
    channels: {
      id: string;
      organization_id: string;
      name: string;
      channel_type: string;
      house_id: string | null;
      is_post_only: boolean;
      created_at: string;
      archived_at: string | null;
      shift_id: string | null;
    } | null;
  };

  const channelRows = (memberships ?? [])
    .map((m) => {
      const row = m as MembershipRow;
      return row.channels
        ? { ...row.channels, last_read_at: row.last_read_at }
        : null;
    })
    .filter(Boolean) as Array<
    MembershipRow["channels"] & { last_read_at: string | null }
  >;

  const channelIds = channelRows.map((c) => c!.id);

  const dmChannelIds = channelRows
    .filter((c) => c?.channel_type === "dm")
    .map((c) => c!.id);

  const dmPeerMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> =
    {};

  if (dmChannelIds.length > 0) {
    const { data: dmMembers } = await supabase
      .from("channel_members")
      .select("channel_id, user_id, profiles:user_id ( id, full_name, avatar_url )")
      .in("channel_id", dmChannelIds)
      .neq("user_id", ctx.user_id);

    type DmMember = {
      channel_id: string;
      user_id: string;
      profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    };

    for (const row of (dmMembers ?? []) as DmMember[]) {
      if (row.profiles) {
        dmPeerMap[row.channel_id] = row.profiles;
      }
    }
  }

  const { data: messageRows } = channelIds.length
    ? await supabase
        .from("messages")
        .select(
          `
          id, channel_id, parent_message_id, user_id, content, content_html,
          attachments, reactions, edited_at, deleted_at, ai_invoked, shift_id, created_at,
          profiles:user_id ( id, full_name, avatar_url )
        `
        )
        .in("channel_id", channelIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(500)
    : { data: [] };

  const messagesByChannel: Record<string, MessageWithAuthor[]> = {};
  const threadReplies: Record<string, MessageWithAuthor[]> = {};
  const replyCounts: Record<string, number> = {};

  for (const raw of (messageRows ?? []) as RawMessageRow[]) {
    const msg = mapRawMessage(raw, ctx.organization_id);

    if (raw.parent_message_id) {
      if (!threadReplies[raw.parent_message_id]) {
        threadReplies[raw.parent_message_id] = [];
      }
      threadReplies[raw.parent_message_id].push(msg);
      replyCounts[raw.parent_message_id] =
        (replyCounts[raw.parent_message_id] ?? 0) + 1;
    } else {
      if (!messagesByChannel[raw.channel_id]) {
        messagesByChannel[raw.channel_id] = [];
      }
      messagesByChannel[raw.channel_id].push(msg);
    }
  }

  for (const list of Object.values(messagesByChannel)) {
    for (const msg of list) {
      msg.reply_count = replyCounts[msg.id] ?? 0;
    }
  }

  const channels: ChannelWithMeta[] = [];
  const dms: ChannelWithMeta[] = [];

  for (const ch of channelRows) {
    if (!ch || ch.archived_at) continue;

    const channelMessages = messagesByChannel[ch.id] ?? [];
    const last = channelMessages[channelMessages.length - 1];
    const lastRead = ch.last_read_at ? new Date(ch.last_read_at) : null;
    const unread = lastRead
      ? channelMessages.filter((m) => new Date(m.created_at) > lastRead).length
      : channelMessages.length;

    const meta: ChannelWithMeta = {
      id: ch.id,
      organization_id: ch.organization_id,
      name: ch.name,
      channel_type: ch.channel_type as ChannelWithMeta["channel_type"],
      house_id: ch.house_id,
      is_post_only: ch.is_post_only,
      created_by: null,
      created_at: ch.created_at,
      archived_at: ch.archived_at,
      unread_count: unread,
      last_message_at: last?.created_at ?? null,
      last_message_preview: last?.content?.slice(0, 80) ?? null,
      dm_user: dmPeerMap[ch.id],
    };

    if (ch.channel_type === "dm") {
      dms.push(meta);
    } else if (ch.channel_type !== "announcement") {
      channels.push(meta);
    }
  }

  return (
    <MessagesView
      channels={channels}
      dms={dms}
      messagesByChannel={messagesByChannel}
      threadReplies={threadReplies}
      currentUserId={ctx.user_id}
    />
  );
}
