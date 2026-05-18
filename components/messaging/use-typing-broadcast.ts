"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTypingBroadcast(channelId: string, userId: string) {
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!channelId) return;
    const supabase = createClient();
    const ch = supabase.channel(`typing:${channelId}`, {
      config: { broadcast: { self: false } },
    });
    ch.subscribe();
    channelRef.current = ch;

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [channelId]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < 2000) return;
    lastSent.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { at: now, userId },
    });
  }, [userId]);

  return { broadcastTyping };
}

export function useTypingListener(
  channelId: string,
  currentUserId: string,
  onTyping: (userId: string) => void
) {
  useEffect(() => {
    if (!channelId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`typing:${channelId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const uid = (payload.payload as { userId?: string }).userId;
        if (uid && uid !== currentUserId) {
          onTyping(uid);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [channelId, currentUserId, onTyping]);
}
