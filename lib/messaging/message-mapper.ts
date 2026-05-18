import { AI_ATTACHMENT_MARKER } from "@/lib/messaging/process-ai-mention";
import type { MessageWithAuthor } from "@/types/messaging";

export const SILMAN_AI_AUTHOR = {
  id: "silman-ai",
  full_name: "Silman AI",
  avatar_url: null,
};

type RawProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
} | null;

export type RawMessageRow = {
  id: string;
  channel_id: string;
  parent_message_id: string | null;
  user_id: string;
  content: string;
  content_html: string | null;
  attachments: unknown;
  reactions: Record<string, string[]> | null;
  edited_at: string | null;
  deleted_at: string | null;
  ai_invoked: boolean;
  shift_id?: string | null;
  created_at: string;
  profiles?: RawProfile;
};

export function mapRawMessage(
  raw: RawMessageRow,
  organizationId: string
): MessageWithAuthor {
  const attachments = Array.isArray(raw.attachments) ? raw.attachments : [];
  const isAiResponse = attachments.some(
    (a) =>
      typeof a === "object" &&
      a !== null &&
      "kind" in a &&
      (a as { kind: string }).kind === AI_ATTACHMENT_MARKER.kind
  );

  return {
    id: raw.id,
    organization_id: organizationId,
    channel_id: raw.channel_id,
    parent_message_id: raw.parent_message_id,
    user_id: raw.user_id,
    content: raw.content,
    content_html: raw.content_html,
    attachments,
    reactions: raw.reactions ?? {},
    edited_at: raw.edited_at,
    deleted_at: raw.deleted_at,
    deleted_by: null,
    ai_invoked: raw.ai_invoked,
    shift_id: raw.shift_id ?? null,
    created_at: raw.created_at,
    author: isAiResponse
      ? SILMAN_AI_AUTHOR
      : (raw.profiles ?? {
          id: raw.user_id,
          full_name: null,
          avatar_url: null,
        }),
  };
}
