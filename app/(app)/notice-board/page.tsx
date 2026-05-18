import { redirect } from "next/navigation";
import { NoticeBoardClient } from "@/components/notice-board/notice-board-client";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";
import type { AnnouncementWithMeta } from "@/types/messaging";

export const metadata = {
  title: "Notice Board — Silman",
};

export default async function NoticeBoardPage() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.NOTICE_BOARD_VIEW)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("announcements")
    .select(
      `
      id, organization_id, channel_id, message_id, title, priority, category,
      target_audience, requires_acknowledgment, pinned, expires_at, scheduled_for,
      created_by, created_at, deleted_at,
      messages ( content ),
      profiles:created_by ( full_name )
    `
    )
    .eq("organization_id", ctx.organization_id)
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const ids = (rows ?? []).map((r) => (r as { id: string }).id);

  const { data: ackRows } = ids.length
    ? await supabase
        .from("announcement_acknowledgments")
        .select("announcement_id, user_id")
        .in("announcement_id", ids)
    : { data: [] };

  const ackCounts: Record<string, number> = {};
  const userAcked = new Set<string>();

  for (const ack of ackRows ?? []) {
    const row = ack as { announcement_id: string; user_id: string };
    ackCounts[row.announcement_id] = (ackCounts[row.announcement_id] ?? 0) + 1;
    if (row.user_id === ctx.user_id) {
      userAcked.add(row.announcement_id);
    }
  }

  type RawRow = {
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
    messages: { content: string } | null;
    profiles: { full_name: string | null } | null;
  };

  const now = new Date();
  const announcements: AnnouncementWithMeta[] = (rows ?? [])
    .map((raw) => {
      const r = raw as RawRow;
      if (r.scheduled_for && new Date(r.scheduled_for) > now) return null;
      if (r.expires_at && new Date(r.expires_at) < now) return null;

      return {
        id: r.id,
        organization_id: r.organization_id,
        channel_id: r.channel_id,
        message_id: r.message_id,
        title: r.title,
        priority: r.priority,
        category: r.category,
        target_audience: r.target_audience,
        requires_acknowledgment: r.requires_acknowledgment,
        pinned: r.pinned,
        expires_at: r.expires_at,
        scheduled_for: r.scheduled_for,
        created_by: r.created_by,
        created_at: r.created_at,
        deleted_at: r.deleted_at,
        content: r.messages?.content ?? "",
        author_name: r.profiles?.full_name ?? null,
        ack_count: ackCounts[r.id] ?? 0,
        user_acknowledged: userAcked.has(r.id),
      };
    })
    .filter(Boolean) as AnnouncementWithMeta[];

  return <NoticeBoardClient announcements={announcements} />;
}
