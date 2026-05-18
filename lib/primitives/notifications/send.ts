import { createServiceClient } from "@/lib/supabase/server";
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationType,
} from "@/lib/primitives/notifications/types";

export interface NotificationPayload {
  organization_id: string;
  user_ids?: string[];
  roles?: string[];
  house_id?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  action_url?: string;
  related_entity?: {
    entity_type: string;
    entity_id: string;
    metadata?: Record<string, unknown>;
  };
}

const DEFAULT_CHANNELS: NotificationChannel[] = ["in_app", "email"];

function channelsForUser(
  type: NotificationType,
  prefs: NotificationPreferences | null
): NotificationChannel[] {
  const configured = prefs?.channels?.[type];
  if (configured?.length) return configured;

  const channels: NotificationChannel[] = ["in_app"];
  if (prefs?.email_enabled !== false) {
    channels.push("email");
  }
  if (prefs?.sms_enabled && type === "reminder_due") {
    channels.push("sms");
  }
  return channels.length > 1 ? channels : DEFAULT_CHANNELS.includes("email")
    ? ["in_app", "email"]
    : ["in_app"];
}

async function resolveRecipientIds(
  payload: NotificationPayload
): Promise<string[]> {
  if (payload.user_ids?.length) {
    return Array.from(new Set(payload.user_ids));
  }

  const supabase = createServiceClient();
  let query = supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", payload.organization_id)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (payload.roles?.length) {
    query = query.in("role", payload.roles);
  }

  const { data: profiles } = await query;

  let ids = (profiles ?? []).map((p) => p.id);

  if (payload.house_id) {
    const { data: assignments } = await supabase
      .from("house_assignments")
      .select("user_id")
      .eq("house_id", payload.house_id);

    const houseUserIds = new Set((assignments ?? []).map((a) => a.user_id));
    ids = ids.filter((id) => houseUserIds.has(id));
  }

  return Array.from(new Set(ids));
}

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.length < 8) {
    const message =
      "RESEND_API_KEY is required to send email notifications in production.";
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.info("[notifications] email stub", { to, subject });
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Silman <notifications@silman.app>",
      to: [to],
      subject,
      text: body,
    }),
  });
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    const message =
      "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required to send SMS notifications in production.";
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.info("[notifications] sms stub", { to, body: body.slice(0, 80) });
    return;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );
}

/** Unified notification dispatcher (in-app, email, SMS). */
export async function sendNotification(
  payload: NotificationPayload
): Promise<{ sent: number }> {
  const supabase = createServiceClient();
  const userIds = await resolveRecipientIds(payload);

  if (userIds.length === 0) {
    return { sent: 0 };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, phone, notification_preferences")
    .in("id", userIds);

  let sent = 0;

  for (const profile of profiles ?? []) {
    const prefs = (profile.notification_preferences ?? {}) as NotificationPreferences;
    const channels = channelsForUser(payload.type, prefs);

    if (channels.includes("in_app")) {
      const { error } = await supabase.from("notifications").insert({
        user_id: profile.id,
        organization_id: payload.organization_id,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        action_url: payload.action_url ?? null,
        related_entity_type: payload.related_entity?.entity_type ?? null,
        related_entity_id: payload.related_entity?.entity_id ?? null,
      });

      if (!error) sent += 1;
    }

    if (channels.includes("email") && profile.email) {
      await sendEmail(
        profile.email,
        payload.title,
        payload.body ?? payload.title
      );
    }

    if (channels.includes("sms") && profile.phone) {
      await sendSms(profile.phone, payload.body ?? payload.title);
    }
  }

  return { sent };
}
