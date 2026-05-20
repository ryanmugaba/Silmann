"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, startOfWeek } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitAvailability } from "@/app/(app)/roster/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailabilityStatus } from "@/lib/types/roster";

const STATUS_CYCLE: (AvailabilityStatus | null)[] = [
  "available",
  "preferred",
  "unavailable",
  null,
];

const STATUS_STYLE: Record<string, string> = {
  available: "bg-success/25 border-success/50 text-foreground",
  preferred: "bg-success/45 border-success/70 text-foreground",
  unavailable: "bg-muted border-border text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  preferred: "Preferred",
  unavailable: "Unavailable",
};

type CellState = { date: string; status: AvailabilityStatus | null };

export function MyAvailabilityClient({
  initialCells,
  lockedDates,
}: {
  initialCells: Array<{ date: string; status: AvailabilityStatus | null }>;
  lockedDates: string[];
}) {
  const router = useRouter();
  const weeks = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 28 }, (_, i) =>
      format(addDays(start, i), "yyyy-MM-dd")
    );
  }, []);

  const initialMap = useMemo(() => {
    const map = new Map<string, AvailabilityStatus | null>();
    for (const c of initialCells) map.set(c.date, c.status);
    return map;
  }, [initialCells]);

  const [cells, setCells] = useState<CellState[]>(
    weeks.map((date) => ({
      date,
      status: initialMap.get(date) ?? null,
    }))
  );
  const [pending, startTransition] = useTransition();
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [lastSavedCount, setLastSavedCount] = useState<number | null>(null);

  const lockedSet = new Set(lockedDates);

  const summary = useMemo(() => {
    const set = cells.filter((c) => c.status != null);
    return {
      total: set.length,
      available: set.filter((c) => c.status === "available").length,
      preferred: set.filter((c) => c.status === "preferred").length,
      unavailable: set.filter((c) => c.status === "unavailable").length,
    };
  }, [cells]);

  const cycle = (date: string) => {
    if (lockedSet.has(date)) return;
    setCells((prev) =>
      prev.map((c) => {
        if (c.date !== date) return c;
        const idx = STATUS_CYCLE.indexOf(c.status);
        const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
        return { ...c, status: next };
      })
    );
    setSubmittedAt(null);
  };

  const handleSubmit = () => {
    const payload = cells.filter((c) => c.status != null);
    if (payload.length === 0) {
      toast.error("Tap at least one day to set availability before submitting.");
      return;
    }
    const fd = new FormData();
    fd.set("cells", JSON.stringify(payload));
    startTransition(async () => {
      const result = await submitAvailability(fd);
      if (result.success) {
        setSubmittedAt(new Date().toISOString());
        setLastSavedCount(payload.length);
        toast.success(
          result.message ?? `Saved availability for ${payload.length} day(s)`
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {submittedAt ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" strokeWidth={1.5} />
          <div>
            <p className="font-medium text-foreground">Availability submitted</p>
            <p className="text-muted-foreground">
              {lastSavedCount} day(s) saved at{" "}
              {format(new Date(submittedAt), "d MMM yyyy, h:mm a")}. Your roster
              coordinator can see this on the roster.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-success/50 bg-success/25" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-success/70 bg-success/45" />
          Preferred
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border bg-muted" />
          Unavailable
        </span>
        <span className="ml-auto font-medium text-foreground">
          {summary.total} day(s) set
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const locked = lockedSet.has(cell.date);
          const style = cell.status
            ? STATUS_STYLE[cell.status]
            : "border-dashed border-border bg-card";
          return (
            <button
              key={cell.date}
              type="button"
              disabled={locked || pending}
              onClick={() => cycle(cell.date)}
              title={
                locked
                  ? "Availability locked for this week"
                  : cell.status ?? "Not set — tap to set"
              }
              className={cn(
                "flex h-14 flex-col items-center justify-center rounded-xl border text-xs transition-colors duration-150",
                style,
                locked && "cursor-not-allowed opacity-50"
              )}
            >
              <span className="font-medium">{format(new Date(cell.date), "d")}</span>
              <span className="text-[10px] capitalize">
                {locked ? "Locked" : cell.status ? STATUS_LABEL[cell.status] : "—"}
              </span>
            </button>
          );
        })}
      </div>

      <Button onClick={handleSubmit} disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit availability"}
      </Button>
    </div>
  );
}
