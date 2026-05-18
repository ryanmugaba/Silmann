import { Skeleton } from "@/components/ui/skeleton";

export default function ParticipantsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px] rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
