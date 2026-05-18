"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { ChannelList } from "@/components/messaging/channel-list";
import { MessageList } from "@/components/messaging/message-list";
import { MessageComposer } from "@/components/messaging/message-composer";
import { ThreadPanel } from "@/components/messaging/thread-panel";
import { NewDmDialog } from "@/components/messaging/new-dm-dialog";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ChannelWithMeta, MessageWithAuthor } from "@/types/messaging";

type MessagesViewProps = {
  channels: ChannelWithMeta[];
  dms: ChannelWithMeta[];
  messagesByChannel: Record<string, MessageWithAuthor[]>;
  threadReplies: Record<string, MessageWithAuthor[]>;
  currentUserId: string;
};

export function MessagesView({
  channels,
  dms,
  messagesByChannel,
  threadReplies,
  currentUserId,
}: MessagesViewProps) {
  const router = useRouter();
  const allChannels = useMemo(() => [...channels, ...dms], [channels, dms]);
  const [selectedId, setSelectedId] = useState<string | null>(
    allChannels[0]?.id ?? null
  );
  const [threadParent, setThreadParent] = useState<MessageWithAuthor | null>(
    null
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const selected = allChannels.find((c) => c.id === selectedId);
  const messages = selectedId ? messagesByChannel[selectedId] ?? [] : [];
  const replies = threadParent ? threadReplies[threadParent.id] ?? [] : [];

  function selectChannel(id: string) {
    setSelectedId(id);
    setThreadParent(null);
    setMobileNavOpen(false);
  }

  const sidebar = (
    <>
      <div className="border-b px-4 py-3">
        <h1 className="font-display text-lg font-semibold tracking-heading">
          Messages
        </h1>
      </div>
      <div className="border-b p-2">
        <Can permission={PermissionKey.MESSAGE_SEND}>
          <NewDmDialog
            onCreated={(id) => {
              selectChannel(id);
              router.refresh();
            }}
          />
        </Can>
      </div>
      <ChannelList
        channels={channels}
        dms={dms}
        selectedId={selectedId}
        onSelect={selectChannel}
      />
    </>
  );

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col md:-m-6 lg:-m-8 lg:h-[calc(100vh-5rem)]">
      <div className="flex flex-1 overflow-hidden rounded-2xl border bg-card shadow-card">
        <aside className="hidden w-64 shrink-0 flex-col border-r md:flex lg:w-72">
          {sidebar}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <header className="flex items-center gap-2 border-b px-4 py-3">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-xl md:hidden"
                      aria-label="Open channels"
                      type="button"
                    >
                      <Menu className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Channels</SheetTitle>
                    </SheetHeader>
                    {sidebar}
                  </SheetContent>
                </Sheet>
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{selected.name}</h2>
                  {selected.last_message_preview ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.last_message_preview}
                    </p>
                  ) : null}
                </div>
              </header>
              <MessageList
                channelId={selected.id}
                channelName={selected.name}
                messages={messages}
                currentUserId={currentUserId}
                onReply={(msg) => setThreadParent(msg)}
              />
              <Can permission={PermissionKey.MESSAGE_SEND}>
                <MessageComposer
                  channelId={selected.id}
                  currentUserId={currentUserId}
                  disabled={selected.is_post_only}
                  onSent={() => router.refresh()}
                />
              </Can>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Select a channel to start messaging
            </div>
          )}
        </section>

        <ThreadPanel
          open={Boolean(threadParent)}
          channelId={selectedId ?? ""}
          parentMessage={threadParent}
          replies={replies}
          currentUserId={currentUserId}
          onClose={() => setThreadParent(null)}
          onReplySent={() => router.refresh()}
        />
      </div>
    </div>
  );
}
