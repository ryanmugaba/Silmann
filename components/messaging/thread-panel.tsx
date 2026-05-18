"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { MessageComposer } from "@/components/messaging/message-composer";
import type { MessageWithAuthor } from "@/types/messaging";

type ThreadPanelProps = {
  open: boolean;
  channelId: string;
  parentMessage: MessageWithAuthor | null;
  replies: MessageWithAuthor[];
  currentUserId: string;
  onClose: () => void;
  onReplySent?: () => void;
};

export function ThreadPanel({
  open,
  channelId,
  parentMessage,
  replies,
  currentUserId,
  onClose,
  onReplySent,
}: ThreadPanelProps) {
  return (
    <AnimatePresence>
      {open && parentMessage ? (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex w-full max-w-md flex-col border-l bg-card shadow-card lg:w-96"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display text-sm font-semibold tracking-heading">
              Thread
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-xl"
              onClick={onClose}
              aria-label="Close thread"
              type="button"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <MessageBubble
              message={parentMessage}
              currentUserId={currentUserId}
              compact
            />
            <div className="border-t px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </p>
            </div>
            {replies.map((reply) => (
              <MessageBubble
                key={reply.id}
                message={reply}
                currentUserId={currentUserId}
                compact
              />
            ))}
          </ScrollArea>
          <MessageComposer
            channelId={channelId}
            currentUserId={currentUserId}
            parentMessageId={parentMessage.id}
            placeholder="Reply in thread…"
            onSent={onReplySent}
          />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
