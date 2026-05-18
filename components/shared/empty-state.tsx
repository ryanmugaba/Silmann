import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-8 py-16 text-center shadow-card",
        className
      )}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
        aria-hidden
      >
        <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-heading">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <Button asChild className="mt-6 rounded-xl" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <Button className="mt-6 rounded-xl" size="sm" onClick={onAction} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
