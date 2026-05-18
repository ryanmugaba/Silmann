import { SkeletonCalendar } from "@/components/shared/skeleton-calendar";
import { Skeleton } from "@/components/ui/skeleton";

export default function RosterLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-4 w-64" />
      <SkeletonCalendar variant="week" />
    </div>
  );
}
