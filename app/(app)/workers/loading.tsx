import { Skeleton } from "@/components/ui/skeleton";

export default function WorkersLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-[400px] w-full rounded-2xl" />
    </div>
  );
}
