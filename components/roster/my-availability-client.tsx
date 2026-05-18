"use client";

import { useMemo, useState, useTransition } from "react";
import { addDays, format, startOfWeek } from "date-fns";
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
  available: "bg-success/25 border-success/40",
  preferred: "bg-success/45 border-success/60",
  unavailable: "bg-muted border-border",
};

type CellState = { date: string; status: AvailabilityStatus | null };

export function MyAvailabilityClient({
  initialCells,
  lockedDates,
  isMock,
}: {
  initialCells: Array<{ date: string; status: AvailabilityStatus | null }>;
  lockedDates: string[];
  isMock?: boolean;
}) {
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

  const lockedSet = new Set(lockedDates);

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
  };

  const handleSubmit = () => {
    const payload = cells.filter((c) => c.status != null);
    const fd = new FormData();
    fd.set("cells", JSON.stringify(payload));
    startTransition(async () => {
      const result = await submitAvailability(fd);
      if (result.success) toast.success("Availability submitted");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-4">
      {isMock ? (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Demo mode — availability is stored locally until Supabase is connected.
        </p>
      ) : null}

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
          const style = cell.status ? STATUS_STYLE[cell.status] : "border-dashed bg-card";
          return (
            <button
              key={cell.date}
              type="button"
              disabled={locked}
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
              <span className="text-[10px] capitalize text-muted-foreground">
                {locked ? "Locked" : cell.status ?? "—"}
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
