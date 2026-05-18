"use client";

import { useState } from "react";
import { Loader2, MessageCirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createDmChannel, searchDmUsers } from "@/app/(app)/messages/actions";
import { toast } from "sonner";

type NewDmDialogProps = {
  onCreated: (channelId: string) => void;
};

export function NewDmDialog({ onCreated }: NewDmDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<
    Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);

  async function search(q: string) {
    setQuery(q);
    const result = await searchDmUsers(q);
    setUsers(result.users ?? []);
  }

  async function startDm(userId: string) {
    setLoading(true);
    const result = await createDmChannel(userId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.channelId) {
      onCreated(result.channelId);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full rounded-xl">
          <MessageCirclePlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          New message
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Start a direct message</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search people…"
          value={query}
          onChange={(e) => void search(e.target.value)}
          className="rounded-xl"
        />
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                disabled={loading}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => void startDm(u.id)}
              >
                <span>{u.full_name ?? "User"}</span>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
