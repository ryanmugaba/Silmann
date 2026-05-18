import { SkeletonCard } from "@/components/shared/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <Skeleton className="h-5 w-96 rounded-lg" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <SkeletonCard count={4} />
    </div>
  );
}
