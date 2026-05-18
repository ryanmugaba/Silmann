"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CalendarPlus,
  Megaphone,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { AiCommandBar, shouldRouteToAi } from "@/components/shared/ai-command-bar";
import { useCan } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const canRoster = useCan(PermissionKey.ROSTER_CREATE);
  const canParticipant = useCan(PermissionKey.PARTICIPANT_CREATE);
  const canNotice = useCan(PermissionKey.NOTICE_BOARD_POST);

  const run = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(href);
    },
    [onOpenChange, router]
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const isAiQuery = shouldRouteToAi(query);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          shouldFilter={!isAiQuery}
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or ask AI: roster Sarah on 13 June…"
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {isAiQuery
                ? "Ask Silman AI to create shifts, find cover, or check availability."
                : "No results found."}
            </Command.Empty>

            {isAiQuery ? (
              <Command.Group heading="AI">
                <AiCommandBar
                  query={query}
                  onClose={() => onOpenChange(false)}
                />
              </Command.Group>
            ) : null}

            <Command.Group heading="Quick actions">
              {canRoster ? (
                <Command.Item
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                  onSelect={() => run("/roster?action=create-shift")}
                >
                  <CalendarPlus className="h-4 w-4" strokeWidth={1.5} />
                  Create shift
                </Command.Item>
              ) : null}
              {canParticipant ? (
                <Command.Item
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                  onSelect={() => run("/participants/new")}
                >
                  <UserPlus className="h-4 w-4" strokeWidth={1.5} />
                  Add participant
                </Command.Item>
              ) : null}
              {canNotice ? (
                <Command.Item
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                  onSelect={() => run("/notice-board?action=post")}
                >
                  <Megaphone className="h-4 w-4" strokeWidth={1.5} />
                  Post announcement
                </Command.Item>
              ) : null}
            </Command.Group>

            <Command.Group heading="Navigation">
              <Command.Item
                className="flex cursor-pointer rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => run("/dashboard")}
              >
                Dashboard
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => run("/roster")}
              >
                Roster
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => run("/participants")}
              >
                Participants
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => run("/settings")}
              >
                Settings
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => run("/help")}
              >
                Help
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Recent">
              <Command.Item
                className="flex cursor-pointer rounded-xl px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent"
                disabled
              >
                Recent items appear as you use Silman
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
