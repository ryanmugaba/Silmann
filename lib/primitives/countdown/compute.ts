import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type {
  CountdownEntity,
  CountdownSeverity,
  CountdownStatus,
  CountdownStatusResult,
} from "./types";

export function getDaysRemaining(
  expiryDate: string,
  referenceDate: Date = new Date()
): number {
  const expiry = startOfDay(parseISO(expiryDate));
  const today = startOfDay(referenceDate);
  return differenceInCalendarDays(expiry, today);
}

/**
 * Severity for the band between thresholds.
 * e.g. medication [30,14,7,0]: (14,30]=green, (7,14]=amber, (0,7]=red, <=0=red.
 */
export function computeSeverity(
  daysRemaining: number,
  thresholds: number[],
  severities: CountdownSeverity[]
): CountdownSeverity {
  if (daysRemaining < 0) {
    return severities[severities.length - 1] ?? "red";
  }

  const sorted = [...thresholds]
    .map((threshold, index) => ({
      threshold,
      severity: severities[index] ?? "red",
    }))
    .sort((a, b) => b.threshold - a.threshold);

  for (let i = 0; i < sorted.length; i++) {
    const { threshold, severity } = sorted[i];
    const lowerBound =
      i < sorted.length - 1 ? sorted[i + 1].threshold : Number.NEGATIVE_INFINITY;

    if (daysRemaining <= threshold && daysRemaining > lowerBound) {
      return severity;
    }
  }

  return "green";
}

/** Next threshold boundary still above current days remaining (escalation point). */
export function getNextThreshold(
  daysRemaining: number,
  thresholds: number[]
): number | null {
  const sorted = [...thresholds].sort((a, b) => b - a);
  for (const threshold of sorted) {
    if (daysRemaining > threshold) {
      return threshold;
    }
  }
  return null;
}

export function deriveStatus(
  daysRemaining: number,
  currentStatus: CountdownStatus
): CountdownStatus {
  if (currentStatus === "resolved") {
    return "resolved";
  }
  if (daysRemaining < 0) {
    return "expired";
  }
  if (currentStatus === "acknowledged") {
    return "acknowledged";
  }
  return "active";
}

export function computeCountdownStatus(
  entity: Pick<
    CountdownEntity,
    "expiry_date" | "thresholds" | "severity_per_threshold" | "status"
  >,
  referenceDate: Date = new Date(),
  _firedThresholds: number[] = []
): CountdownStatusResult {
  const days_remaining = getDaysRemaining(entity.expiry_date, referenceDate);
  const severity = computeSeverity(
    days_remaining,
    entity.thresholds,
    entity.severity_per_threshold
  );
  const status = deriveStatus(days_remaining, entity.status);
  const next_threshold = getNextThreshold(days_remaining, entity.thresholds);

  return { days_remaining, severity, next_threshold, status };
}

/** Thresholds newly crossed since last cron run (days_remaining <= threshold, not yet fired). */
export function getNewlyCrossedThresholds(
  daysRemaining: number,
  thresholds: number[],
  firedThresholds: number[]
): number[] {
  const fired = new Set(firedThresholds);
  return thresholds.filter(
    (t) => daysRemaining <= t && !fired.has(t)
  );
}
