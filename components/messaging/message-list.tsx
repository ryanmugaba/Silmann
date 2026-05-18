"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageBubble } from "@/components/messaging/message-bubble";
import {
  fetchMessageById,
  loadOlderMessages,
  markChannelRead,
} from "@/app/(app)/messages/actions";
import { createClient } from "@/lib/supabase/client";
import { useTypingListener } from "@/components/messaging/use-typing-broadcast";
import type { MessageWithAuthor } from "@/types/messaging";

type MessageListProps = {
  channelId: string;
  channelName: string;
  messages: MessageWithAuthor[];
  currentUserId: string;
  onReply: (message: MessageWithAuthor) => void;
};

export function MessageList({
  channelId,
  channelName,
  messages: initialMessages,
  currentUserId,
  onReply,
}: MessageListProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= 30);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
    setHasMore(initialMessages.length >= 30);
  }, [initialMessages, channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, channelId]);

  useEffect(() => {
    void markChannelRead(channelId);
  }, [channelId, messages.length]);

  const appendMessage = useCallback(
    async (messageId: string) => {
      const result = await fetchMessageById(messageId);
      if (!result.message) return;
      const msg = result.message;
      if (msg.parent_message_id) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const id = (payload.new as { id: string }).id;
          void appendMessage(id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appendMessage, channelId, router]);

  useTypingListener(channelId, currentUserId, () => {
    setTypingLabel("Someone is typing…");
  });

  useEffect(() => {
    if (!typingLabel) return;
    const t = setTimeout(() => setTypingLabel(null), 3000);
    return () => clearTimeout(t);
  }, [typingLabel]);

  async function handleLoadOlder() {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0]?.created_at;
    if (!oldest) {
      setLoadingOlder(false);
      return;
    }
    const result = await loadOlderMessages(channelId, oldest);
    setLoadingOlder(false);
    if (result.messages?.length) {
      setMessages((prev) => [...result.messages, ...prev]);
      setHasMore(result.messages.length >= 30);
    } else {
      setHasMore(false);
    }
  }

  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void handleLoadOlder();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, messages.length, hasMore, loadingOlder]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={MessageSquare}
          title={`Welcome to #${channelName}`}
          description="This is the start of the channel. Send a message to get the conversation going."
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col py-4">
          <div ref={topRef} className="h-1" />
          {loadingOlder ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              onReply={onReply}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      {typingLabel ? (
        <p className="absolute bottom-1 left-4 text-xs text-muted-foreground">
          {typingLabel}
        </p>
      ) : null}
    </div>
  );
}
