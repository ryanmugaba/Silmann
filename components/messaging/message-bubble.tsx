"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Reply } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renderMessageMarkdown } from "@/lib/messaging/markdown";
import { cn } from "@/lib/utils";
import type { MessageWithAuthor } from "@/types/messaging";
import { addReaction, deleteMessage, editMessage } from "@/app/(app)/messages/actions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉"];

type MessageBubbleProps = {
  message: MessageWithAuthor;
  currentUserId: string;
  onReply?: (message: MessageWithAuthor) => void;
  compact?: boolean;
};

export function MessageBubble({
  message,
  currentUserId,
  onReply,
  compact = false,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwn = message.user_id === currentUserId;
  const isDeleted = Boolean(message.deleted_at);
  const initials =
    message.author.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  async function handleReaction(emoji: string) {
    const result = await addReaction({ messageId: message.id, emoji });
    if (result.error) {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    const result = await deleteMessage(message.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Message deleted");
    }
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-2 transition-colors hover:bg-muted/40",
        compact && "px-2"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!compact ? (
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={message.author.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">
            {message.author.full_name ?? "Unknown"}
          </span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={message.created_at}
          >
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </time>
          {message.edited_at ? (
            <span className="text-xs text-muted-foreground">(edited)</span>
          ) : null}
          {message.ai_invoked ? (
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              AI
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-0.5 text-sm leading-relaxed",
            isDeleted && "italic text-muted-foreground"
          )}
          dangerouslySetInnerHTML={{
            __html: isDeleted
              ? message.content
              : renderMessageMarkdown(message.content),
          }}
        />
        {!isDeleted && Array.isArray(message.attachments) && message.attachments.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att, i) => {
              if (typeof att !== "object" || att === null || !("url" in att)) {
                return null;
              }
              const a = att as { url: string; name?: string; type?: string; kind?: string };
              if (a.kind === "ai_response") return null;
              if (a.type?.startsWith("audio/")) {
                return <audio key={i} controls src={a.url} className="max-w-full" />;
              }
              if (a.type?.startsWith("image/")) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={a.url}
                    alt={a.name ?? "attachment"}
                    className="max-h-48 rounded-xl border object-cover"
                  />
                );
              }
              return (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  {a.name ?? "Download file"}
                </a>
              );
            })}
          </div>
        ) : null}
        {Object.keys(message.reactions ?? {}).length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReaction(emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  users.includes(currentUserId)
                    ? "border-primary/30 bg-primary/10"
                    : "hover:bg-muted"
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        ) : null}
        {!isDeleted && (message.reply_count ?? 0) > 0 && onReply ? (
          <button
            type="button"
            onClick={() => onReply(message)}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"} — view thread
          </button>
        ) : null}
      </div>
      {showActions && !isDeleted ? (
        <div className="absolute right-2 top-1 flex items-center gap-0.5 rounded-xl border bg-card p-0.5 shadow-card">
          {QUICK_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-lg p-0 text-base"
              onClick={() => handleReaction(emoji)}
              aria-label={`React with ${emoji}`}
              type="button"
            >
              {emoji}
            </Button>
          ))}
          {onReply ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-lg"
              onClick={() => onReply(message)}
              aria-label="Reply in thread"
              type="button"
            >
              <Reply className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          ) : null}
          {isOwn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-lg"
                  aria-label="Message options"
                  type="button"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  Edit message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-danger">
                  Delete message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                void editMessage({
                  messageId: message.id,
                  content: editContent,
                }).then((result) => {
                  if (result.error) toast.error(result.error);
                  else {
                    setEditing(false);
                    toast.success("Message updated");
                  }
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
