"use client";

import { useState } from "react";
import { ChevronDown, Hash, AtSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChannelWithMeta } from "@/types/messaging";

type ChannelListProps = {
  channels: ChannelWithMeta[];
  dms: ChannelWithMeta[];
  selectedId: string | null;
  onSelect: (channelId: string) => void;
};

function ChannelSection({
  title,
  items,
  selectedId,
  onSelect,
  defaultOpen = true,
}: {
  title: string;
  items: ChannelWithMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")}
          strokeWidth={1.5}
        />
        {title}
      </button>
      {open ? (
        <ul className="space-y-0.5 px-1">
          {items.map((ch) => {
            const isDm = ch.channel_type === "dm";
            const label = isDm
              ? ch.dm_user?.full_name ?? ch.name
              : ch.name;
            const active = selectedId === ch.id;

            return (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ch.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isDm ? (
                    <AtSign className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  ) : (
                    <Hash className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  )}
                  <span className="truncate">{label}</span>
                  {ch.unread_count > 0 ? (
                    <Badge
                      variant="default"
                      className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-xs"
                    >
                      {ch.unread_count > 99 ? "99+" : ch.unread_count}
                    </Badge>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function ChannelList({
  channels,
  dms,
  selectedId,
  onSelect,
}: ChannelListProps) {
  const recent = [...channels, ...dms]
    .filter((c) => c.last_message_at)
    .sort(
      (a, b) =>
        new Date(b.last_message_at!).getTime() -
        new Date(a.last_message_at!).getTime()
    )
    .slice(0, 5);

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        <ChannelSection
          title="Channels"
          items={channels}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <ChannelSection
          title="Direct Messages"
          items={dms}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <ChannelSection
          title="Recent"
          items={recent}
          selectedId={selectedId}
          onSelect={onSelect}
          defaultOpen={false}
        />
      </div>
    </ScrollArea>
  );
}
