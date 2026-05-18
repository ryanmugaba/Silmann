import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-5 w-80 max-w-full rounded-lg" />
      </div>
      <SkeletonCard count={3} />
    </div>
  );
}
