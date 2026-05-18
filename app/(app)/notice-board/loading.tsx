import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function NoticeBoardLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-72 animate-pulse rounded-lg bg-muted" />
      </div>
      <SkeletonCard count={3} />
    </div>
  );
}
