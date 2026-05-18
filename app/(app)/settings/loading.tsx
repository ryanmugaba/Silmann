import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/shared/skeleton-table";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <SkeletonTable rows={6} columns={4} />
    </div>
  );
}
