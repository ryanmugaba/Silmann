"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOTIFICATION_TYPES } from "@/lib/primitives/notifications/types";
import { updateProfile } from "@/app/(app)/settings/actions";
import { toast } from "sonner";

type ProfileFormProps = {
  initial: {
    fullName: string;
    email: string;
    phone: string;
    notificationPreferences?: Record<string, unknown>;
  };
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const prefs = initial.notificationPreferences ?? {};
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [density, setDensity] = useState<string>(
    (prefs.density as string) ?? "comfortable"
  );
  const [emailEnabled, setEmailEnabled] = useState(
    prefs.email_enabled !== false
  );
  const [reminderEmail, setReminderEmail] = useState(true);
  const [mentionEmail, setMentionEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile({
      fullName,
      phone: phone || undefined,
      notificationPreferences: {
        email_enabled: emailEnabled,
        density,
        channels: {
          reminder_due: reminderEmail ? ["in_app", "email"] : ["in_app"],
          mention: mentionEmail ? ["in_app", "email"] : ["in_app"],
        },
      },
    });
    setSaving(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Profile updated");
      document.documentElement.setAttribute("data-density", density);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display tracking-heading">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={initial.email}
                disabled
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>Display density</Label>
              <Select value={density} onValueChange={setDensity}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="rounded-xl" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border p-4">
            <Label htmlFor="email-enabled">Email notifications (global)</Label>
            <Switch
              id="email-enabled"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <Label>Reminder due emails</Label>
            <Switch checked={reminderEmail} onCheckedChange={setReminderEmail} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <Label>@mention emails</Label>
            <Switch checked={mentionEmail} onCheckedChange={setMentionEmail} />
          </div>
          <p className="text-xs text-muted-foreground">
            Types: {NOTIFICATION_TYPES.join(", ")}. SMS requires Twilio keys in
            integrations.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Password changes are managed via the forgot-password flow on the login
            page.
          </p>
          <p>Two-factor authentication (2FA) will be available in a future release.</p>
          <Button type="button" variant="outline" className="rounded-xl" disabled>
            Set up 2FA (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
