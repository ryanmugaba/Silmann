"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { updateOrganization } from "@/app/(app)/settings/actions";
import { toast } from "sonner";

type OrganizationFormProps = {
  initial: {
    name: string;
    abn: string;
    ndisRegistrationNumber: string;
    timezone: string;
    brandColor: string;
  };
};

export function OrganizationForm({ initial }: OrganizationFormProps) {
  const [name, setName] = useState(initial.name);
  const [abn, setAbn] = useState(initial.abn);
  const [ndis, setNdis] = useState(initial.ndisRegistrationNumber);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [brandColor, setBrandColor] = useState(initial.brandColor);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateOrganization({
      name,
      abn: abn || undefined,
      ndisRegistrationNumber: ndis || undefined,
      timezone,
      brandColor: brandColor || undefined,
    });
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success("Organisation updated");
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading">
          Organisation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-abn">ABN</Label>
            <Input
              id="org-abn"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-ndis">NDIS registration number</Label>
            <Input
              id="org-ndis"
              value={ndis}
              onChange={(e) => setNdis(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                <SelectItem value="Australia/Brisbane">Australia/Brisbane</SelectItem>
                <SelectItem value="Australia/Perth">Australia/Perth</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-brand">Brand accent colour</Label>
            <div className="flex gap-2">
              <Input
                id="org-brand"
                type="color"
                value={brandColor || "#2563eb"}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg p-1"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#2563eb"
                className="rounded-lg font-mono"
              />
            </div>
          </div>
          <Can permission={PermissionKey.SETTINGS_EDIT}>
            <Button type="submit" className="rounded-xl" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </Can>
        </form>
      </CardContent>
    </Card>
  );
}
