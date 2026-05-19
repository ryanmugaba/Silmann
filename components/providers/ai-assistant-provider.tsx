"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSilmanAiChat } from "@/lib/ai/use-silman-ai-chat";
import type { AiChatMessage, AiToolCallLog } from "@/lib/ai/types";

export type AiAssistantState = "minimized" | "open";

type AiAssistantContextValue = {
  state: AiAssistantState;
  open: () => void;
  minimize: () => void;
  toggle: () => void;
  messages: AiChatMessage[];
  toolCalls: AiToolCallLog[];
  loading: boolean;
  error: string | null;
  send: (content: string) => Promise<boolean>;
  reset: () => void;
};

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AiAssistantState>("minimized");
  const chat = useSilmanAiChat();

  const open = useCallback(() => setState("open"), []);
  const minimize = useCallback(() => setState("minimized"), []);
  const toggle = useCallback(
    () => setState((current) => (current === "open" ? "minimized" : "open")),
    []
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const value = useMemo<AiAssistantContextValue>(
    () => ({
      state,
      open,
      minimize,
      toggle,
      messages: chat.messages,
      toolCalls: chat.toolCalls,
      loading: chat.loading,
      error: chat.error,
      send: chat.send,
      reset: chat.reset,
    }),
    [state, open, minimize, toggle, chat]
  );

  return (
    <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>
  );
}

export function useAiAssistant() {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error("useAiAssistant must be used within AiAssistantProvider");
  }
  return context;
}
