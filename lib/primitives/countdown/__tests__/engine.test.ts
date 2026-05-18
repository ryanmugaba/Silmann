import { describe, expect, it } from "vitest";
import {
  computeCountdownStatus,
  computeSeverity,
  deriveStatus,
  getDaysRemaining,
  getNewlyCrossedThresholds,
  getNextThreshold,
} from "../compute";
import { DEFAULT_MEDICATION, DEFAULT_PLAN_DATES } from "../types";

describe("countdown compute", () => {
  const ref = new Date("2026-05-17T10:00:00+10:00");

  it("computes days remaining until expiry", () => {
    expect(getDaysRemaining("2026-06-16", ref)).toBe(30);
    expect(getDaysRemaining("2026-05-16", ref)).toBe(-1);
  });

  it("assigns severity from medication thresholds", () => {
    const { thresholds, severity_per_threshold } = DEFAULT_MEDICATION;
    expect(computeSeverity(25, thresholds, severity_per_threshold)).toBe("green");
    expect(computeSeverity(14, thresholds, severity_per_threshold)).toBe("amber");
    expect(computeSeverity(7, thresholds, severity_per_threshold)).toBe("red");
    expect(computeSeverity(0, thresholds, severity_per_threshold)).toBe("red");
    expect(computeSeverity(-3, thresholds, severity_per_threshold)).toBe("red");
  });

  it("assigns severity from plan date thresholds", () => {
    const { thresholds, severity_per_threshold } = DEFAULT_PLAN_DATES;
    expect(computeSeverity(75, thresholds, severity_per_threshold)).toBe("green");
    expect(computeSeverity(45, thresholds, severity_per_threshold)).toBe("amber");
    expect(computeSeverity(15, thresholds, severity_per_threshold)).toBe("red");
  });

  it("derives expired status when past expiry", () => {
    expect(deriveStatus(-1, "active")).toBe("expired");
    expect(deriveStatus(5, "active")).toBe("active");
    expect(deriveStatus(5, "acknowledged")).toBe("acknowledged");
    expect(deriveStatus(5, "resolved")).toBe("resolved");
  });

  it("returns next escalation threshold", () => {
    expect(getNextThreshold(25, DEFAULT_MEDICATION.thresholds)).toBe(14);
    expect(getNextThreshold(7, DEFAULT_MEDICATION.thresholds)).toBe(0);
  });

  it("detects newly crossed thresholds for cron", () => {
    expect(getNewlyCrossedThresholds(14, DEFAULT_MEDICATION.thresholds, [])).toEqual(
      expect.arrayContaining([30, 14])
    );
    expect(getNewlyCrossedThresholds(14, DEFAULT_MEDICATION.thresholds, [30])).toEqual([14]);
    expect(getNewlyCrossedThresholds(20, DEFAULT_MEDICATION.thresholds, [30])).toEqual([]);
  });

  it("computes full status snapshot for NDIS medication expiry", () => {
    const status = computeCountdownStatus(
      {
        expiry_date: "2026-05-24",
        thresholds: DEFAULT_MEDICATION.thresholds,
        severity_per_threshold: DEFAULT_MEDICATION.severity_per_threshold,
        status: "active",
      },
      ref,
      [30]
    );

    expect(status.days_remaining).toBe(7);
    expect(status.severity).toBe("red");
    expect(status.status).toBe("active");
    expect(status.next_threshold).toBe(0);
  });
});
