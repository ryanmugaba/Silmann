import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SkeletonCardProps = {
  count?: number;
  className?: string;
};

export function SkeletonCard({ count = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-card p-5 shadow-card"
          aria-hidden
        >
          <Skeleton className="h-5 w-2/3 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-full rounded-lg" />
          <Skeleton className="mt-2 h-4 w-4/5 rounded-lg" />
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
