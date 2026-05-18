"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { inviteWorker } from "@/app/(app)/workers/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HouseRow } from "@/types/database";

type InviteWorkerDialogProps = {
  houses: Pick<HouseRow, "id" | "name">[];
};

export function InviteWorkerDialog({ houses }: InviteWorkerDialogProps) {
  const searchParams = useSearchParams();
  const openFromUrl = searchParams.get("invite") === "1";
  const [open, setOpen] = useState(openFromUrl);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(
    new Set(houses[0]?.id ? [houses[0].id] : [])
  );
  const [pending, startTransition] = useTransition();

  const toggleHouse = (id: string, checked: boolean) => {
    setSelectedHouses((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    Array.from(selectedHouses).forEach((id) => form.append("houseIds", id));

    startTransition(async () => {
      const result = await inviteWorker(form);
      if (result.success && result.data?.inviteToken) {
        const url = `${window.location.origin}/invite/${result.data.inviteToken}`;
        setInviteLink(url);
        toast.success(result.message ?? "Invitation created");
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setInviteLink(null);
      }}
    >
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-heading">
            Invite support worker
          </DialogTitle>
          <DialogDescription>
            Send an invitation email and assign houses they will work in.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the worker (valid 7 days):
            </p>
            <div className="flex gap-2">
              <Input readOnly value={inviteLink} className="rounded-lg text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
            <DialogFooter>
              <Button className="rounded-xl" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="worker@example.com"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Employment type</Label>
              <Select name="employmentType" defaultValue="casual">
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="full_time">Full-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Houses</Label>
              <div className="space-y-2 rounded-xl border p-3">
                {houses.map((house) => (
                  <label
                    key={house.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedHouses.has(house.id)}
                      onCheckedChange={(c) => toggleHouse(house.id, c === true)}
                    />
                    {house.name}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={pending || selectedHouses.size === 0}
              >
                {pending ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
