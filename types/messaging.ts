export type ChannelType =
  | "dm"
  | "group_dm"
  | "house_channel"
  | "role_channel"
  | "topic_channel"
  | "announcement";

export type ChannelRow = {
  id: string;
  organization_id: string;
  name: string;
  channel_type: ChannelType;
  house_id: string | null;
  is_post_only: boolean;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
};

export type ChannelMemberRow = {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  notification_preference: "all" | "mentions" | "muted";
};

export type MessageRow = {
  id: string;
  organization_id: string;
  channel_id: string;
  parent_message_id: string | null;
  user_id: string;
  content: string;
  content_html: string | null;
  attachments: unknown[];
  reactions: Record<string, string[]>;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  ai_invoked: boolean;
  shift_id: string | null;
  created_at: string;
};

export type MessageWithAuthor = MessageRow & {
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  reply_count?: number;
};

export type ChannelWithMeta = ChannelRow & {
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  dm_user?: { id: string; full_name: string | null; avatar_url: string | null };
};

export type AnnouncementRow = {
  id: string;
  organization_id: string;
  channel_id: string;
  message_id: string;
  title: string;
  priority: "standard" | "urgent";
  category: string | null;
  target_audience: Record<string, unknown>;
  requires_acknowledgment: boolean;
  pinned: boolean;
  expires_at: string | null;
  scheduled_for: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type AnnouncementWithMeta = AnnouncementRow & {
  content: string;
  author_name: string | null;
  ack_count: number;
  user_acknowledged: boolean;
};

export const NOTICE_CATEGORIES = [
  "General",
  "Policy Update",
  "Roster Update",
  "Training",
  "Incident Awareness",
  "Celebration",
] as const;

export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];
