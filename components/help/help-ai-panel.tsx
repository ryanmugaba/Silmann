"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type HelpMessage = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "How do I create a shift?",
  "How do I use the AI command bar?",
  "How do workers submit availability?",
  "Where do I invite a worker?",
];

export function HelpAiPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me how to use Silman. I can explain roster, participants, workers, reminders, notice board, messages, and the AI command bar. Settings changes still happen manually in Settings.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(question = input) {
    const prompt = question.trim();
    if (!prompt || loading) return;

    const nextMessages: HelpMessage[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.filter((message) => message.role !== "assistant" || message.content),
        }),
      });
      const data = (await response.json()) as {
        content?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Help request failed");
        return;
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.content ?? "I could not answer that. Try rephrasing it.",
        },
      ]);
    } catch {
      setError("Could not reach Silman Help.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card shadow-card">
      <div className="border-b p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-heading">
              Ask Silman Help
            </h2>
            <p className="text-sm text-muted-foreground">
              Product guidance only. Operational prompts still run from the command bar.
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[480px] space-y-3 overflow-y-auto p-5">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
              message.role === "user"
                ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                : "mr-auto max-w-[90%] border bg-muted/40 text-foreground"
            )}
          >
            {message.content}
          </div>
        ))}
        {loading ? (
          <div className="mr-auto max-w-[90%] space-y-2 rounded-2xl border bg-muted/40 px-4 py-3">
            <div className="h-3 w-40 animate-pulse rounded-full bg-muted-foreground/20" />
            <div className="h-3 w-28 animate-pulse rounded-full bg-muted-foreground/15" />
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t p-5">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void ask(suggestion)}
              disabled={loading}
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask how to use Silman..."
            className="min-h-[80px] flex-1 resize-none"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void ask();
              }
            }}
          />
          <Button
            type="button"
            className="self-end"
            onClick={() => void ask()}
            disabled={loading || !input.trim()}
          >
            <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Ask
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: press Ctrl+Enter or Command+Enter to send.
        </p>
      </div>
    </div>
  );
}
