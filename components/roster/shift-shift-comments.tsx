"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { MessageSquare } from "lucide-react";
import { getShiftDetailMeta } from "@/app/(app)/roster/actions";
import { ensureShiftChannel } from "@/app/(app)/messages/actions";
import { MessageComposer } from "@/components/messaging/message-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type ShiftComment = {
  id: string;
  author: string;
  content: string;
  created_at: string;
};

export function ShiftShiftComments({
  shiftId,
  currentUserId,
}: {
  shiftId: string;
  currentUserId: string;
}) {
  const [comments, setComments] = useState<ShiftComment[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const result = await getShiftDetailMeta(shiftId);
    if (result.success && result.data) {
      setComments(result.data.comments ?? []);
      if (result.data.channelId) {
        setChannelId(result.data.channelId);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [shiftId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
        Shift comments
      </p>
      {comments.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">
          No comments yet. Notes sync to Messages for channel members.
        </p>
      ) : (
        <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-card px-3 py-2 text-sm shadow-sm">
              <p className="font-medium">{c.author}</p>
              <p className="text-muted-foreground">{c.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(parseISO(c.created_at), "d MMM h:mm a")}
              </p>
            </li>
          ))}
        </ul>
      )}
      {channelId ? (
        <MessageComposer
          channelId={channelId}
          currentUserId={currentUserId}
          shiftId={shiftId}
          placeholder="Add a shift note…"
          className="rounded-xl border bg-card"
          onSent={() => void load()}
        />
      ) : (
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => {
            void ensureShiftChannel(shiftId).then((r) => {
              if (r.error) toast.error(r.error);
              else if (r.channelId) {
                setChannelId(r.channelId);
              }
            });
          }}
        >
          Start shift thread
        </button>
      )}
    </div>
  );
}
