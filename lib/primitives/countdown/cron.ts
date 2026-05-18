import { createServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/primitives/notifications/send";
import {
  computeCountdownStatus,
  getDaysRemaining,
  getNewlyCrossedThresholds,
} from "./compute";
import {
  getActiveEntitiesForCron,
  getEntityEvents,
  insertCountdownEvent,
} from "./engine";
import type { CountdownEntity, CountdownSeverity } from "./types";

export interface CronRunResult {
  processed: number;
  events_created: number;
  notifications_sent: number;
  errors: string[];
}

function severityForThreshold(
  entity: CountdownEntity,
  thresholdDays: number
): CountdownSeverity {
  const index = entity.thresholds.indexOf(thresholdDays);
  return entity.severity_per_threshold[index] ?? "red";
}

function buildNotificationTitle(entity: CountdownEntity, daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `${entity.label} has expired`;
  }
  if (daysRemaining === 0) {
    return `${entity.label} expires today`;
  }
  return `${entity.label} expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
}

/**
 * Daily threshold check (intended for 6:00 Australia/Sydney via Edge Function cron).
 */
export async function runDailyCountdownCheck(
  referenceDate: Date = new Date()
): Promise<CronRunResult> {
  const supabase = await createServiceClient();
  const entities = await getActiveEntitiesForCron();

  const result: CronRunResult = {
    processed: 0,
    events_created: 0,
    notifications_sent: 0,
    errors: [],
  };

  for (const entity of entities) {
    result.processed += 1;

    try {
      const daysRemaining = getDaysRemaining(entity.expiry_date, referenceDate);
      const events = await getEntityEvents(supabase, entity.id);
      const firedThresholds = events.map((e) => e.threshold_days);
      const newlyCrossed = getNewlyCrossedThresholds(
        daysRemaining,
        entity.thresholds,
        firedThresholds
      );

      if (daysRemaining < 0 && entity.status === "active") {
        await supabase
          .from("countdown_entities")
          .update({ status: "expired" })
          .eq("id", entity.id);
      }

      if (newlyCrossed.length === 0) {
        continue;
      }

      const status = computeCountdownStatus(entity, referenceDate, firedThresholds);

      for (const threshold of newlyCrossed) {
        const severity = severityForThreshold(entity, threshold);
        await insertCountdownEvent(supabase, entity.id, threshold, severity);
        result.events_created += 1;
      }

      await supabase
        .from("countdown_entities")
        .update({ last_notified_at: referenceDate.toISOString() })
        .eq("id", entity.id);

      await sendNotification({
        organization_id: entity.organization_id,
        roles: entity.notify_roles,
        user_ids: entity.notify_users,
        house_id: entity.house_id,
        type: "countdown_threshold",
        title: buildNotificationTitle(entity, daysRemaining),
        body: `Threshold alert for ${entity.entity_type.replace(/_/g, " ")}.`,
        action_url: `/reminders?countdown=${entity.id}`,
        related_entity: {
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          metadata: {
            countdown_id: entity.id,
            days_remaining: status.days_remaining,
            severity: status.severity,
          },
        },
      });

      result.notifications_sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${entity.id}: ${message}`);
    }
  }

  return result;
}
