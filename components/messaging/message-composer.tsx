"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, Paperclip, Send, Smile, Square } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  sendMessage,
  sendVoiceMessage,
  uploadMessageAttachment,
} from "@/app/(app)/messages/actions";
import { RichTextEditor } from "@/components/messaging/rich-text-editor";
import {
  MentionAutocomplete,
  type MentionMember,
} from "@/components/messaging/mention-autocomplete";
import { useTypingBroadcast } from "@/components/messaging/use-typing-broadcast";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  { ssr: false }
);

type Attachment = {
  url: string;
  name: string;
  type: string;
  size?: number;
};

type MessageComposerProps = {
  channelId: string;
  currentUserId: string;
  parentMessageId?: string;
  shiftId?: string;
  placeholder?: string;
  disabled?: boolean;
  onSent?: () => void;
  className?: string;
};

export function MessageComposer({
  channelId,
  currentUserId,
  parentMessageId,
  shiftId,
  placeholder = "Message… **bold**, *italic*, @mention",
  disabled = false,
  onSent,
  className,
}: MessageComposerProps) {
  const [plain, setPlain] = useState("");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { broadcastTyping } = useTypingBroadcast(channelId, currentUserId);

  const handleSend = useCallback(async () => {
    const trimmed = plain.trim();
    if ((!trimmed && attachments.length === 0) || sending || disabled) return;

    setSending(true);
    const result = await sendMessage({
      channelId,
      content: trimmed || "📎 Attachment",
      contentHtml: html,
      parentMessageId,
      shiftId,
      attachments: attachments.length ? attachments : undefined,
    });
    setSending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setPlain("");
    setHtml("");
    setAttachments([]);
    onSent?.();
  }, [
    attachments,
    channelId,
    disabled,
    html,
    onSent,
    parentMessageId,
    plain,
    sending,
    shiftId,
  ]);

  function handleEditorChange(text: string, nextHtml: string) {
    setPlain(text);
    setHtml(nextHtml);
    broadcastTyping();

    const match = text.match(/@([\w.]*)$/);
    if (match) {
      setMentionQuery(match[1] ?? "");
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(member: MentionMember) {
    const handle = member.handle;
    const next = plain.replace(/@[\w.]*$/, `@${handle} `);
    setPlain(next);
    setShowMentions(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.set("file", file);
    const result = await uploadMessageAttachment(form);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.attachment) {
      setAttachments((prev) => [...prev, result.attachment!]);
    }
    e.target.value = "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.set("file", new File([blob], "voice.webm", { type: "audio/webm" }));
        const upload = await uploadMessageAttachment(form);
        if (upload.error || !upload.attachment) {
          toast.error(upload.error ?? "Upload failed");
          return;
        }
        const voice = await sendVoiceMessage({
          channelId,
          audioUrl: upload.attachment.url,
          durationSeconds: Math.max(1, Math.round(blob.size / 16000)),
        });
        if (voice.error) {
          toast.error(voice.error);
        } else {
          onSent?.();
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className={cn("relative border-t bg-card p-3", className)}>
      <MentionAutocomplete
        channelId={channelId}
        query={mentionQuery}
        visible={showMentions}
        onSelect={insertMention}
      />

      {showEmoji ? (
        <div className="mb-2 overflow-hidden rounded-2xl border shadow-card">
          <EmojiPicker
            onEmojiClick={(emoji) => {
              setPlain((c) => c + emoji.emoji);
            }}
            width="100%"
            height={280}
          />
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs"
            >
              {a.name}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, j) => j !== i))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => void handleFileChange(e)}
        />
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-xl"
            aria-label="Attach file"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 w-9 rounded-xl",
              recording && "bg-danger/10 text-danger"
            )}
            aria-label={recording ? "Stop recording" : "Record voice message"}
            disabled={disabled}
            onClick={() => (recording ? stopRecording() : void startRecording())}
          >
            {recording ? (
              <Square className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={1.5} />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-xl"
            aria-label="Insert emoji"
            onClick={() => setShowEmoji((s) => !s)}
            disabled={disabled}
          >
            <Smile className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>

        <RichTextEditor
          value={plain}
          onChange={handleEditorChange}
          placeholder={placeholder}
          disabled={disabled || sending}
          onKeyDown={handleKeyDown}
        />

        <Button
          type="button"
          size="sm"
          className="h-9 rounded-xl px-3"
          onClick={() => void handleSend()}
          disabled={disabled || sending || (!plain.trim() && attachments.length === 0)}
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Send className="h-4 w-4" strokeWidth={1.5} />
          )}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Enter to send · Shift+Enter for new line · @AI for assistant
      </p>
    </div>
  );
}
