"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TargetAudienceBuilder,
  type TargetAudience,
} from "@/components/notice-board/target-audience-builder";
import { NOTICE_CATEGORIES } from "@/types/messaging";
import { createAnnouncement } from "@/app/(app)/notice-board/actions";
import { toast } from "sonner";

type NewNoticeFormProps = {
  houses: { id: string; name: string }[];
  users: { id: string; full_name: string | null }[];
};

export function NewNoticeForm({ houses, users }: NewNoticeFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>(NOTICE_CATEGORIES[0]);
  const [priority, setPriority] = useState<"standard" | "urgent">("standard");
  const [requiresAck, setRequiresAck] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [audience, setAudience] = useState<TargetAudience>({
    roles: [],
    houses: [],
    userIds: [],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await createAnnouncement({
      title,
      content,
      category,
      priority,
      requiresAcknowledgment: requiresAck,
      pinned,
      targetAudience: audience,
      scheduledFor: scheduledFor
        ? new Date(scheduledFor).toISOString()
        : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(scheduledFor ? "Notice scheduled" : "Notice published");
    router.push("/notice-board");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="rounded-xl">
        <Link href="/notice-board">
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Back
        </Link>
      </Button>
      <h1 className="font-display text-3xl font-semibold tracking-heading">
        New notice
      </h1>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Announcement details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                required
                className="rounded-lg"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {NOTICE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as "standard" | "urgent")}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TargetAudienceBuilder
              value={audience}
              onChange={setAudience}
              houses={houses}
              users={users}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled">Schedule for (optional)</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expires (optional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-4">
              <Label htmlFor="requires-ack">Requires acknowledgment</Label>
              <Switch
                id="requires-ack"
                checked={requiresAck}
                onCheckedChange={setRequiresAck}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <Label htmlFor="pinned">Pin to top</Label>
              <Switch
                id="pinned"
                checked={pinned}
                onCheckedChange={setPinned}
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={submitting}
            >
              {submitting
                ? "Saving…"
                : scheduledFor
                  ? "Schedule notice"
                  : "Publish notice"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
