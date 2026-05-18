import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy
      aria-label="Loading table"
    >
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1 rounded-lg" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={`${row}-${col}`} className="h-4 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
