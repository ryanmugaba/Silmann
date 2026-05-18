import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CountdownEntityRow {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  expiry_date: string;
  thresholds: number[];
  severity_per_threshold: string[];
  notify_roles: string[];
  notify_users: string[] | null;
  house_id: string | null;
  metadata: Record<string, unknown>;
  status: string;
}

function daysRemaining(expiryDate: string, ref: Date): number {
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const today = new Date(ref);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function newlyCrossed(
  days: number,
  thresholds: number[],
  fired: number[]
): number[] {
  const firedSet = new Set(fired);
  return thresholds.filter((t) => days <= t && !firedSet.has(t));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const referenceDate = new Date();
    const { data: entities, error } = await supabase
      .from("countdown_entities")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    let eventsCreated = 0;
    let notificationsSent = 0;

    for (const entity of (entities ?? []) as CountdownEntityRow[]) {
      const days = daysRemaining(entity.expiry_date, referenceDate);

      if (days < 0) {
        await supabase
          .from("countdown_entities")
          .update({ status: "expired" })
          .eq("id", entity.id);
        continue;
      }

      const { data: events } = await supabase
        .from("countdown_events")
        .select("threshold_days")
        .eq("countdown_entity_id", entity.id);

      const fired = (events ?? []).map((e) => e.threshold_days as number);
      const crossed = newlyCrossed(days, entity.thresholds, fired);

      if (crossed.length === 0) {
        continue;
      }

      for (const threshold of crossed) {
        const index = entity.thresholds.indexOf(threshold);
        const severity = entity.severity_per_threshold[index] ?? "red";

        await supabase.from("countdown_events").insert({
          countdown_entity_id: entity.id,
          threshold_days: threshold,
          severity,
        });
        eventsCreated += 1;
      }

      await supabase
        .from("countdown_entities")
        .update({ last_notified_at: referenceDate.toISOString() })
        .eq("id", entity.id);

      // Notification delivery wired in app layer (Resend / in-app)
      notificationsSent += 1;
    }

    return new Response(
      JSON.stringify({
        processed: entities?.length ?? 0,
        events_created: eventsCreated,
        notifications_sent: notificationsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
