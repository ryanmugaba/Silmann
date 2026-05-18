import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] gap-0 overflow-hidden rounded-2xl border md:-m-6 lg:-m-8">
      <div className="hidden w-64 border-r p-4 md:block">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <Skeleton className="h-14 w-full rounded-none" />
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded-lg" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
