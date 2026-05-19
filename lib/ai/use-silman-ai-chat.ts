"use client";

import { useCallback, useState } from "react";
import type { AiChatMessage, AiToolCallLog } from "@/lib/ai/types";

export const SILMAN_AI_WELCOME: AiChatMessage = {
  role: "assistant",
  content:
    "Hi — I'm Silman AI. Tell me what you need in plain English and I'll roster shifts, check availability, post notices, set reminders, and more.",
};

export function useSilmanAiChat(initialMessage: AiChatMessage = SILMAN_AI_WELCOME) {
  const [messages, setMessages] = useState<AiChatMessage[]>([initialMessage]);
  const [toolCalls, setToolCalls] = useState<AiToolCallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || loading) return false;

      const userMessage: AiChatMessage = { role: "user", content };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setError(null);
      setLoading(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });

        const data = (await res.json()) as {
          content?: string;
          error?: string;
          toolCalls?: AiToolCallLog[];
        };

        if (!res.ok) {
          setError(data.error ?? "Request failed");
          return false;
        }

        if (data.toolCalls?.length) {
          setToolCalls((prev) => [...prev, ...data.toolCalls!]);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content ?? "Done.",
          },
        ]);
        return true;
      } catch {
        setError("Could not reach Silman AI");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const reset = useCallback(() => {
    setMessages([initialMessage]);
    setToolCalls([]);
    setError(null);
  }, [initialMessage]);

  return {
    messages,
    toolCalls,
    loading,
    error,
    send,
    reset,
  };
}
