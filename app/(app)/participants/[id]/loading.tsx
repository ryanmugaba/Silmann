import { Skeleton } from "@/components/ui/skeleton";

export default function ParticipantDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full max-w-xl rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
