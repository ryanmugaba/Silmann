import { Skeleton } from "@/components/ui/skeleton";

export default function RemindersLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-5 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
