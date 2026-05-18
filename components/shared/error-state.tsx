import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  icon: Icon = AlertCircle,
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger/5 px-8 py-12 text-center",
        className
      )}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10"
        aria-hidden
      >
        <Icon className="h-7 w-7 text-danger" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-heading">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button className="mt-6 rounded-xl" size="sm" onClick={onRetry} type="button">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
