"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { AnnouncementCard } from "@/components/notice-board/announcement-card";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { NOTICE_CATEGORIES, type AnnouncementWithMeta } from "@/types/messaging";

type NoticeBoardClientProps = {
  announcements: AnnouncementWithMeta[];
};

export function NoticeBoardClient({ announcements }: NoticeBoardClientProps) {
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    if (category === "all") return announcements;
    return announcements.filter((a) => a.category === category);
  }, [announcements, category]);

  const pinned = filtered.filter((a) => a.pinned);
  const rest = filtered.filter((a) => !a.pinned);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-heading">
            Notice Board
          </h1>
          <p className="text-muted-foreground">
            Organisation announcements and updates for your team.
          </p>
        </div>
        <Can permission={PermissionKey.NOTICE_BOARD_POST}>
          <Button asChild className="rounded-xl">
            <Link href="/notice-board/new">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              New notice
            </Link>
          </Button>
        </Can>
      </div>

      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-full max-w-xs rounded-xl">
          <SelectValue placeholder="Filter by category" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all">All categories</SelectItem>
          {NOTICE_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notices yet"
          description="When managers post announcements, they will appear here."
          actionLabel="Create notice"
          actionHref="/notice-board/new"
        />
      ) : (
        <div className="space-y-4">
          {pinned.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
          {rest.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      )}
    </div>
  );
}
