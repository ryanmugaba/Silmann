import { Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SkeletonCalendarProps = {
  className?: string;
  variant?: "month" | "week";
};

export function SkeletonCalendar({
  className,
  variant = "month",
}: SkeletonCalendarProps) {
  if (variant === "week") {
    return (
      <div
        className={cn("rounded-3xl border bg-card p-4 shadow-card", className)}
        aria-busy
        aria-label="Loading roster calendar"
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-8 w-56 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-96">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-2xl border bg-border">
          <div className="bg-card" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`head-${i}`} className="bg-card p-3">
              <Skeleton className="h-4 rounded" />
            </div>
          ))}
          {Array.from({ length: 8 }).map((_, row) => (
            <Fragment key={`row-${row}`}>
              <div key={`time-${row}`} className="bg-card p-2">
                <Skeleton className="h-3 rounded" />
              </div>
              {Array.from({ length: 7 }).map((__, col) => (
                <div key={`cell-${row}-${col}`} className="min-h-16 bg-card p-2">
                  {(row + col) % 4 === 0 ? (
                    <Skeleton className="h-10 rounded-xl" />
                  ) : null}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}
      aria-busy
      aria-label="Loading calendar"
    >
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`dow-${i}`} className="h-4 rounded" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={`day-${i}`} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
