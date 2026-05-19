"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { useAiAssistant } from "@/components/providers/ai-assistant-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Roster Sarah at Parramatta tomorrow 9–5",
  "Who is available this Saturday?",
  "Show unfilled shifts this week",
  "Remind me to review Alex's plan Friday",
];

export function AiAssistantDock() {
  const {
    state,
    open,
    minimize,
    messages,
    toolCalls,
    loading,
    error,
    send,
    reset,
  } = useAiAssistant();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (state !== "open" || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, state]);

  async function handleSend(text = input) {
    const ok = await send(text);
    if (ok) setInput("");
  }

  return (
    <>
      <AnimatePresence>
        {state === "open" ? (
          <motion.aside
            key="ai-panel"
            initial={reducedMotion ? false : { x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reducedMotion ? undefined : { x: "100%", opacity: 0.9 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed z-40 flex flex-col border-l border-primary/20 bg-card shadow-2xl",
              "inset-y-0 right-0 w-full sm:max-w-[22rem] md:max-w-[24rem]",
              "pb-[calc(env(safe-area-inset-bottom)+4.5rem)] lg:pb-0"
            )}
            aria-label="Silman AI assistant"
          >
            <header className="relative shrink-0 overflow-hidden border-b border-primary/15 bg-gradient-to-br from-violet-500/15 via-primary/10 to-transparent px-4 py-4">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl"
                animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-violet-500/15 blur-2xl"
                animate={reducedMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.25, 0.45, 0.25] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />

              <motion.div className="relative flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-primary text-primary-foreground shadow-md ring-2 ring-primary/25">
                  <Sparkles className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold tracking-heading">
                      Silman AI
                    </h2>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      AI
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Plain English in — rostering & ops out
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={reset}
                    aria-label="Clear conversation"
                    title="Clear conversation"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={minimize}
                    aria-label="Minimize AI assistant"
                    title="Minimize"
                  >
                    <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </motion.div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" ? (
                    <motion.div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/90 to-primary text-primary-foreground"
                      aria-hidden
                    >
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </motion.div>
                  ) : null}
                  <p
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-primary/10 bg-muted/50 text-foreground"
                    )}
                  >
                    {message.content}
                  </p>
                </div>
              ))}

              {loading ? (
                <div className="flex gap-2">
                  <motion.div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/90 to-primary text-primary-foreground">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.5} />
                  </motion.div>
                  <div className="space-y-2 rounded-2xl border border-primary/10 bg-muted/40 px-3.5 py-3">
                    <div className="h-2.5 w-36 animate-pulse rounded-full bg-muted-foreground/20" />
                    <motion.div className="h-2.5 w-24 animate-pulse rounded-full bg-muted-foreground/15" />
                  </div>
                </div>
              ) : null}

              {toolCalls.length > 0 ? (
                <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                    Actions taken
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {toolCalls.slice(-6).map((toolCall, index) => (
                      <li key={`${toolCall.name}-${index}`} className="flex items-center gap-1.5">
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                          strokeWidth={1.5}
                        />
                        <span className="font-mono text-foreground">{toolCall.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 space-y-3 border-t border-primary/10 bg-card/95 px-4 py-4 backdrop-blur-sm">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal px-2.5 py-1 text-left text-xs leading-snug"
                    disabled={loading}
                    onClick={() => void handleSend(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="e.g. Roster James at Blacktown SIL on Friday 7–3"
                  className="min-h-[72px] flex-1 resize-none border-primary/20 focus-visible:ring-primary/40"
                  disabled={loading}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0 bg-gradient-to-br from-violet-600 to-primary shadow-md hover:opacity-95"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  aria-label="Send to Silman AI"
                >
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter to send · Shift+Enter for a new line · Ctrl/⌘+Shift+L to toggle
              </p>
            </footer>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {state === "minimized" ? (
          <motion.button
            key="ai-fab"
            type="button"
            initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reducedMotion ? undefined : { scale: 0.85, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            onClick={open}
            className={cn(
              "fixed z-40 flex items-center gap-2 rounded-full pr-4 shadow-lg ring-2 ring-primary/30",
              "bg-gradient-to-r from-violet-600 to-primary text-primary-foreground",
              "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 lg:bottom-6",
              "hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            )}
            aria-label="Open Silman AI assistant"
          >
            <span className="relative flex h-12 w-12 items-center justify-center">
              {!reducedMotion ? (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full bg-primary-foreground/25"
                />
              ) : null}
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Sparkles className="h-5 w-5" strokeWidth={1.5} />
              </span>
            </span>
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-sm font-semibold">Silman AI</span>
              <span className="text-[11px] opacity-90">Tap to ask</span>
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Compact sparkles control for the top bar. */
export function AiAssistantTopBarButton({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { toggle, state } = useAiAssistant();

  return (
    <Button
      type="button"
      size="sm"
      onClick={toggle}
      className={cn(
        "gap-2 bg-gradient-to-r from-violet-600/90 to-primary text-primary-foreground shadow-sm hover:opacity-95",
        className
      )}
      aria-label={state === "open" ? "Close Silman AI" : "Open Silman AI"}
      aria-pressed={state === "open"}
    >
      <Sparkles className="h-4 w-4" strokeWidth={1.5} />
      {showLabel ? <span>Silman AI</span> : null}
    </Button>
  );
}
