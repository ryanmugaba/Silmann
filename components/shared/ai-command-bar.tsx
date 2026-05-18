"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

type ToolCallLog = {
  name: string;
  input: unknown;
  result: unknown;
};

export type AiCommandBarProps = {
  query: string;
  onClose?: () => void;
  className?: string;
};

export function shouldRouteToAi(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.startsWith("@") || trimmed.startsWith("ask ")) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length > 3;
}

export function AiCommandBar({ query, onClose, className }: AiCommandBarProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = query.startsWith("@") ? query.slice(1).trim() : query.trim();

  const run = async () => {
    if (!prompt || loading) return;
    setLoading(true);
    setError(null);

    const userMessage: AiMessage = { role: "user", content: prompt };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await res.json()) as {
        content?: string;
        error?: string;
        toolCalls?: ToolCallLog[];
      };

      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }

      if (data.toolCalls?.length) {
        setToolCalls(data.toolCalls);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content ?? "" },
      ]);
    } catch {
      setError("Could not reach Silman AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-3 p-2", className)}>
      <div className="flex items-start gap-2 rounded-xl bg-accent/50 p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Silman AI</p>
          <p className="truncate text-sm text-muted-foreground">{prompt || "…"}</p>
        </div>
      </div>

      {messages.length > 0 ? (
        <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {messages.map((m, i) => (
            <p
              key={i}
              className={cn(
                "rounded-xl px-3 py-2",
                m.role === "user" ? "bg-muted" : "bg-card border"
              )}
            >
              {m.content}
            </p>
          ))}
        </div>
      ) : null}

      {toolCalls.length > 0 ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          {toolCalls.map((tc, i) => (
            <p key={i}>
              Ran <span className="font-mono text-foreground">{tc.name}</span>
            </p>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => void run()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
              Thinking…
            </>
          ) : (
            "Ask Silman"
          )}
        </Button>
        {onClose ? (
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
    </div>
  );
}
