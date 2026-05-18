import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SkeletonCalendarProps = {
  className?: string;
};

export function SkeletonCalendar({ className }: SkeletonCalendarProps) {
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
