"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { upsertHouse } from "@/app/(app)/settings/actions";
import { toast } from "sonner";

type House = {
  id: string;
  name: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  max_residents: number | null;
};

export function HousesManager({ houses: initial }: { houses: House[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = await upsertHouse({ name, address: address || undefined });
    if (result.error) toast.error(result.error);
    else {
      toast.success("House created");
      setOpen(false);
      setName("");
      setAddress("");
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display tracking-heading">Houses</CardTitle>
        <Can permission={PermissionKey.HOUSE_CREATE}>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl">
                <Plus className="mr-1 h-4 w-4" strokeWidth={1.5} />
                Add house
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>New house</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="house-name">Name</Label>
                  <Input
                    id="house-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house-address">Address</Label>
                  <Input
                    id="house-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  Create
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </CardHeader>
      <CardContent className="space-y-3">
        {initial.length === 0 ? (
          <p className="text-sm text-muted-foreground">No houses configured yet.</p>
        ) : (
          initial.map((house) => (
            <div
              key={house.id}
              className="rounded-xl border px-4 py-3"
            >
              <p className="font-medium">{house.name}</p>
              {house.address ? (
                <p className="text-sm text-muted-foreground">
                  {house.address}
                  {house.suburb ? `, ${house.suburb}` : ""}
                  {house.state ? ` ${house.state}` : ""}
                  {house.postcode ? ` ${house.postcode}` : ""}
                </p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
