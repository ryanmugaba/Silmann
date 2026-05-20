"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { withPermission } from "@/lib/primitives/rbac/server";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { parseMentionNames } from "@/lib/messaging/mentions";
import { processChannelAiMention } from "@/lib/messaging/process-ai-mention";
import { getOrCreateShiftChannel } from "@/lib/messaging/shift-channel";
import { mapRawMessage, type RawMessageRow } from "@/lib/messaging/message-mapper";
import type { MessageWithAuthor } from "@/types/messaging";
import { safeActionError } from "@/lib/errors/action-safe";

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  type: z.string(),
  size: z.number().optional(),
});

const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  contentHtml: z.string().optional(),
  parentMessageId: z.string().uuid().optional(),
  shiftId: z.string().uuid().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const reactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  contentHtml: z.string().optional(),
});

const MESSAGE_SELECT = `
  id, channel_id, parent_message_id, user_id, content, content_html,
  attachments, reactions, edited_at, deleted_at, ai_invoked, shift_id, created_at,
  profiles:user_id ( id, full_name, avatar_url )
`;

async function resolveMentionUserIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  channelId: string,
  names: string[]
): Promise<string[]> {
  if (names.length === 0) return [];

  const { data: members } = await supabase
    .from("channel_members")
    .select("user_id, profiles:user_id ( id, full_name )")
    .eq("channel_id", channelId);

  type MemberRow = {
    user_id: string;
    profiles: { id: string; full_name: string | null } | null;
  };

  const ids: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    for (const m of (members ?? []) as MemberRow[]) {
      const full = m.profiles?.full_name ?? "";
      const slug = full.replace(/\s+/g, "").toLowerCase();
      const first = full.split(/\s+/)[0]?.toLowerCase() ?? "";
      if (
        slug === lower ||
        first === lower ||
        full.toLowerCase().startsWith(lower)
      ) {
        ids.push(m.user_id);
        break;
      }
    }
  }
  return ids;
}

export async function sendMessage(input: z.infer<typeof sendMessageSchema>) {
  const parsed = sendMessageSchema.parse(input);

  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const supabase = await createClient();

    const { data: channel } = await supabase
      .from("channels")
      .select("id, organization_id, is_post_only")
      .eq("id", parsed.channelId)
      .eq("organization_id", ctx.organization_id)
      .is("archived_at", null)
      .single<{ id: string; organization_id: string; is_post_only: boolean }>();

    if (!channel) {
      return { error: "Channel not found" };
    }

    if (channel.is_post_only && ctx.role === "support_worker") {
      return { error: "This channel is read-only" };
    }

    const { data: member } = await supabase
      .from("channel_members")
      .select("id")
      .eq("channel_id", parsed.channelId)
      .eq("user_id", ctx.user_id)
      .maybeSingle();

    if (!member) {
      return { error: "You are not a member of this channel" };
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        channel_id: parsed.channelId,
        organization_id: ctx.organization_id,
        user_id: ctx.user_id,
        content: parsed.content.trim(),
        content_html: parsed.contentHtml ?? null,
        parent_message_id: parsed.parentMessageId ?? null,
        shift_id: parsed.shiftId ?? null,
        attachments: parsed.attachments ?? [],
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return { error: safeActionError(error, "messages") };
    }

    const mentionNames = parseMentionNames(parsed.content);
    const mentionedIds = await resolveMentionUserIds(
      supabase,
      parsed.channelId,
      mentionNames
    );

    if (mentionedIds.length > 0) {
      await supabase.from("message_mentions").insert(
        mentionedIds.map((mentioned_user_id) => ({
          message_id: message.id,
          mentioned_user_id,
        }))
      );
    }

    if (/@AI\b/i.test(parsed.content)) {
      void processChannelAiMention(
        supabase,
        ctx,
        parsed.channelId,
        message.id,
        parsed.content
      ).then(() => {
        revalidatePath("/messages");
        revalidatePath("/roster");
      });
    }

    revalidatePath("/messages");
    revalidatePath("/roster");
    return { success: true, messageId: message.id };
  });
}

export async function ensureShiftChannel(shiftId: string) {
  return withPermission(PermissionKey.MESSAGE_VIEW, async (ctx) => {
    const supabase = await createClient();
    const result = await getOrCreateShiftChannel(supabase, ctx, shiftId);
    if ("error" in result) {
      return { error: result.error };
    }
    return { success: true, channelId: result.channelId };
  });
}

export async function sendShiftComment(input: {
  shiftId: string;
  content: string;
}) {
  const parsed = z
    .object({
      shiftId: z.string().uuid(),
      content: z.string().min(1).max(5000),
    })
    .parse(input);

  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const supabase = await createClient();
    const channelResult = await getOrCreateShiftChannel(
      supabase,
      ctx,
      parsed.shiftId
    );

    if ("error" in channelResult) {
      return { error: channelResult.error };
    }

    return sendMessage({
      channelId: channelResult.channelId,
      content: parsed.content,
      shiftId: parsed.shiftId,
    });
  });
}

export async function uploadMessageAttachment(formData: FormData) {
  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "No file provided" };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { error: "File must be under 10MB" };
    }

    const supabase = await createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${ctx.user_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("message-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      return { error: safeActionError(error, "messages") };
    }

    const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);

    return {
      success: true,
      attachment: {
        url: data.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      },
    };
  });
}

export async function sendVoiceMessage(input: {
  channelId: z.infer<typeof sendMessageSchema>["channelId"];
  audioUrl: string;
  durationSeconds: number;
  transcript?: string;
}) {
  const parsed = z
    .object({
      channelId: z.string().uuid(),
      audioUrl: z.string().url(),
      durationSeconds: z.number().int().positive(),
      transcript: z.string().optional(),
    })
    .parse(input);

  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const supabase = await createClient();
    const content = parsed.transcript?.trim() || "🎤 Voice message";

    const sendResult = await sendMessage({
      channelId: parsed.channelId,
      content,
      attachments: [
        {
          url: parsed.audioUrl,
          name: "voice.webm",
          type: "audio/webm",
        },
      ],
    });

    if (sendResult.error || !sendResult.messageId) {
      return sendResult;
    }

    await supabase.from("voice_messages").insert({
      message_id: sendResult.messageId,
      audio_url: parsed.audioUrl,
      duration_seconds: parsed.durationSeconds,
      transcript: parsed.transcript ?? null,
    });

    return sendResult;
  });
}

export async function getChannelMembers(channelId: string) {
  return withPermission(PermissionKey.MESSAGE_VIEW, async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("channel_members")
      .select("user_id, profiles:user_id ( id, full_name, avatar_url )")
      .eq("channel_id", channelId);

    if (error) {
      return { error: safeActionError(error, "messages"), members: [] };
    }

    type Row = {
      user_id: string;
      profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    };

    return {
      members: ((data ?? []) as Row[]).map((m) => ({
        id: m.user_id,
        full_name: m.profiles?.full_name ?? "User",
        avatar_url: m.profiles?.avatar_url ?? null,
        handle:
          m.profiles?.full_name?.replace(/\s+/g, "") ??
          `user${m.user_id.slice(0, 6)}`,
      })),
    };
  });
}

export async function createDmChannel(targetUserId: string) {
  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const supabase = await createClient();

    if (targetUserId === ctx.user_id) {
      return { error: "Cannot message yourself" };
    }

    const { data: target } = await supabase
      .from("profiles")
      .select("id, full_name, organization_id")
      .eq("id", targetUserId)
      .eq("organization_id", ctx.organization_id)
      .single<{ id: string; full_name: string | null }>();

    if (!target) {
      return { error: "User not found" };
    }

    const { data: myMemberships } = await supabase
      .from("channel_members")
      .select("channel_id, channels!inner(id, channel_type)")
      .eq("user_id", ctx.user_id);

    type Mem = { channel_id: string; channels: { id: string; channel_type: string } };

    for (const m of (myMemberships ?? []) as Mem[]) {
      if (m.channels.channel_type !== "dm") continue;

      const { data: members } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", m.channel_id);

      const ids = (members ?? []).map((x) => x.user_id).sort();
      if (
        ids.length === 2 &&
        ids[0] === [ctx.user_id, targetUserId].sort()[0] &&
        ids[1] === [ctx.user_id, targetUserId].sort()[1]
      ) {
        return { success: true, channelId: m.channel_id };
      }
    }

    const dmName = `DM: ${target.full_name ?? targetUserId}`;

    const { data: channel, error } = await supabase
      .from("channels")
      .insert({
        organization_id: ctx.organization_id,
        name: dmName,
        channel_type: "dm",
        created_by: ctx.user_id,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !channel) {
      return { error: error?.message ?? "Could not create DM" };
    }

    const service = createServiceClient();
    const { error: memberError } = await service.from("channel_members").insert([
      { channel_id: channel.id, user_id: ctx.user_id },
      { channel_id: channel.id, user_id: targetUserId },
    ]);

    if (memberError) {
      return { error: memberError.message };
    }

    revalidatePath("/messages");
    return { success: true, channelId: channel.id };
  });
}

export async function searchDmUsers(query: string) {
  return withPermission(PermissionKey.MESSAGE_VIEW, async (ctx) => {
    const supabase = await createClient();
    const q = query.trim();

    let builder = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("organization_id", ctx.organization_id)
      .neq("id", ctx.user_id)
      .limit(20);

    if (q.length > 0) {
      builder = builder.ilike("full_name", `%${q}%`);
    }

    const { data, error } = await builder;

    if (error) {
      return { error: safeActionError(error, "messages"), users: [] };
    }

    return { users: data ?? [] };
  });
}

export async function addReaction(input: z.infer<typeof reactionSchema>) {
  const parsed = reactionSchema.parse(input);

  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const supabase = await createClient();

    const { data: message } = await supabase
      .from("messages")
      .select("id, reactions, channel_id")
      .eq("id", parsed.messageId)
      .is("deleted_at", null)
      .single<{ id: string; reactions: Record<string, string[]>; channel_id: string }>();

    if (!message) {
      return { error: "Message not found" };
    }

    const reactions = { ...(message.reactions ?? {}) };
    const users = reactions[parsed.emoji] ?? [];
    const idx = users.indexOf(ctx.user_id);

    if (idx >= 0) {
      users.splice(idx, 1);
      if (users.length === 0) {
        delete reactions[parsed.emoji];
      } else {
        reactions[parsed.emoji] = users;
      }
    } else {
      reactions[parsed.emoji] = [...users, ctx.user_id];
    }

    const { error } = await supabase
      .from("messages")
      .update({ reactions })
      .eq("id", parsed.messageId);

    if (error) {
      return { error: safeActionError(error, "messages") };
    }

    revalidatePath("/messages");
    return { success: true, reactions };
  });
}

export async function editMessage(input: z.infer<typeof editMessageSchema>) {
  const parsed = editMessageSchema.parse(input);

  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from("messages")
      .update({
        content: parsed.content.trim(),
        content_html: parsed.contentHtml ?? null,
        edited_at: new Date().toISOString(),
      })
      .eq("id", parsed.messageId)
      .eq("user_id", ctx.user_id)
      .is("deleted_at", null);

    if (error) {
      return { error: safeActionError(error, "messages") };
    }

    revalidatePath("/messages");
    return { success: true };
  });
}

export async function deleteMessage(messageId: string) {
  return withPermission(PermissionKey.MESSAGE_SEND, async (ctx) => {
    const supabase = await createClient();

    const { error } = await supabase
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.user_id,
        content: "This message was deleted",
      })
      .eq("id", messageId)
      .eq("user_id", ctx.user_id);

    if (error) {
      return { error: safeActionError(error, "messages") };
    }

    revalidatePath("/messages");
    return { success: true };
  });
}

export async function markChannelRead(channelId: string) {
  return withPermission(PermissionKey.MESSAGE_VIEW, async (ctx) => {
    const supabase = await createClient();

    await supabase
      .from("channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("user_id", ctx.user_id);

    return { success: true };
  });
}

export async function loadOlderMessages(channelId: string, before: string) {
  return withPermission(PermissionKey.MESSAGE_VIEW, async (ctx) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("channel_id", channelId)
      .is("parent_message_id", null)
      .is("deleted_at", null)
      .lt("created_at", before)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return { error: safeActionError(error, "messages"), messages: [] as MessageWithAuthor[] };
    }

    const messages = ((data ?? []) as RawMessageRow[])
      .map((row) => mapRawMessage(row, ctx.organization_id))
      .reverse();

    return { messages };
  });
}

export async function fetchMessageById(messageId: string) {
  return withPermission(PermissionKey.MESSAGE_VIEW, async (ctx) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("id", messageId)
      .single<RawMessageRow>();

    if (error || !data) {
      return { error: error?.message ?? "Not found", message: null };
    }

    return { message: mapRawMessage(data, ctx.organization_id) };
  });
}
