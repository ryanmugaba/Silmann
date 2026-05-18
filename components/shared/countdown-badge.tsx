"use client";

import { cn } from "@/lib/utils";
import type { CountdownSeverity } from "@/lib/primitives/countdown/types";

const severityStyles: Record<CountdownSeverity, string> = {
  green:
    "bg-success/15 text-success border-success/20 hover:bg-success/20",
  amber:
    "bg-warning/15 text-warning border-warning/20 hover:bg-warning/20",
  red: "bg-danger/15 text-danger border-danger/20 hover:bg-danger/20",
};

export interface CountdownBadgeProps {
  daysRemaining: number;
  severity: CountdownSeverity;
  className?: string;
  showLabel?: boolean;
}

export function CountdownBadge({
  daysRemaining,
  severity,
  className,
  showLabel = true,
}: CountdownBadgeProps) {
  const label =
    daysRemaining < 0
      ? "Expired"
      : daysRemaining === 0
        ? "Today"
        : `${daysRemaining}d`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border px-2.5 py-0.5 text-xs font-medium transition-colors duration-150",
        severityStyles[severity],
        className
      )}
      title={
        daysRemaining < 0
          ? "Past expiry date"
          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
      }
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          severity === "green" && "bg-success",
          severity === "amber" && "bg-warning",
          severity === "red" && "bg-danger"
        )}
        aria-hidden
      />
      {showLabel ? label : null}
    </span>
  );
}
