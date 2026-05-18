"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Pin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { acknowledgeAnnouncement } from "@/app/(app)/notice-board/actions";
import type { AnnouncementWithMeta } from "@/types/messaging";
import { toast } from "sonner";

type AnnouncementCardProps = {
  announcement: AnnouncementWithMeta;
};

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const [acknowledged, setAcknowledged] = useState(announcement.user_acknowledged);
  const [ackCount, setAckCount] = useState(announcement.ack_count);

  async function handleAcknowledge() {
    const wasAcknowledged = acknowledged;
    setAcknowledged(true);
    setAckCount((c) => c + 1);

    const result = await acknowledgeAnnouncement(announcement.id);
    if (result.error) {
      setAcknowledged(wasAcknowledged);
      setAckCount(announcement.ack_count);
      toast.error(result.error);
    } else {
      toast.success("Acknowledged");
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {announcement.pinned ? (
            <Pin className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          ) : null}
          {announcement.priority === "urgent" ? (
            <Badge variant="destructive" className="rounded-lg">
              Urgent
            </Badge>
          ) : null}
          {announcement.category ? (
            <Badge variant="secondary" className="rounded-lg">
              {announcement.category}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-lg">{announcement.title}</CardTitle>
        <CardDescription>
          {announcement.author_name ?? "Unknown"} ·{" "}
          {formatDistanceToNow(new Date(announcement.created_at), {
            addSuffix: true,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {announcement.content}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
            {ackCount} acknowledged
          </span>
          <div className="flex gap-2">
            <Can permission={PermissionKey.NOTICE_BOARD_POST}>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href={`/notice-board/${announcement.id}/acknowledgments`}>
                  View acknowledgments
                </Link>
              </Button>
            </Can>
            {announcement.requires_acknowledgment && !acknowledged ? (
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => void handleAcknowledge()}
                type="button"
              >
                Acknowledge
              </Button>
            ) : acknowledged ? (
              <Badge variant="outline" className="rounded-lg">
                Acknowledged
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
