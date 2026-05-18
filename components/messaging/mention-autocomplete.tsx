"use client";

import { useEffect, useState } from "react";
import { getChannelMembers } from "@/app/(app)/messages/actions";
import { cn } from "@/lib/utils";

export type MentionMember = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  handle: string;
};

type MentionAutocompleteProps = {
  channelId: string;
  query: string;
  onSelect: (member: MentionMember) => void;
  visible: boolean;
};

export function MentionAutocomplete({
  channelId,
  query,
  onSelect,
  visible,
}: MentionAutocompleteProps) {
  const [members, setMembers] = useState<MentionMember[]>([]);

  useEffect(() => {
    if (!channelId) return;
    void getChannelMembers(channelId).then((res) => {
      if (res.members) {
        setMembers(res.members);
      }
    });
  }, [channelId]);

  if (!visible) return null;

  const q = query.toLowerCase();
  const filtered = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(q) ||
      m.handle.toLowerCase().includes(q)
  );

  const options = [
    { id: "ai", full_name: "Silman AI", handle: "AI", avatar_url: null },
    ...filtered,
  ].slice(0, 8);

  if (options.length === 0) return null;

  return (
    <ul className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-64 overflow-y-auto rounded-xl border bg-card py-1 shadow-card">
      {options.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            )}
            onClick={() =>
              onSelect({
                id: m.id,
                full_name: m.full_name,
                avatar_url: m.avatar_url,
                handle: m.handle,
              })
            }
          >
            <span className="font-medium">@{m.handle}</span>
            {m.id !== "ai" ? (
              <span className="truncate text-muted-foreground">{m.full_name}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
