"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { WorkerAvailabilityCell } from "@/lib/types/roster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CELL_STYLES: Record<string, string> = {
  available: "bg-success/20 hover:bg-success/30",
  preferred: "bg-success/40 hover:bg-success/50",
  unavailable: "bg-muted",
  shifted: "bg-danger/20",
  not_submitted: "bg-muted/60 border-dashed",
  locked: "opacity-60 cursor-not-allowed",
};

export type WorkerAvailabilityGridProps = {
  cells: WorkerAvailabilityCell[];
  onCreateShift?: (workerId: string, date: string) => void;
};

export function WorkerAvailabilityGrid({
  cells,
  onCreateShift,
}: WorkerAvailabilityGridProps) {
  const [aggregateView, setAggregateView] = useState(false);

  const { workers, dates } = useMemo(() => {
    const workerMap = new Map<string, string>();
    const dateSet = new Set<string>();
    for (const cell of cells) {
      workerMap.set(cell.workerId, cell.workerName);
      dateSet.add(cell.date);
    }
    return {
      workers: Array.from(workerMap.entries()).map(([id, name]) => ({ id, name })),
      dates: Array.from(dateSet).sort(),
    };
  }, [cells]);

  const cellMap = useMemo(() => {
    const map = new Map<string, WorkerAvailabilityCell>();
    for (const c of cells) {
      map.set(`${c.workerId}:${c.date}`, c);
    }
    return map;
  }, [cells]);

  if (workers.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No availability data yet. Workers submit availability from My Availability.
        </CardContent>
      </Card>
    );
  }

  if (aggregateView) {
    return (
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Aggregate availability</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAggregateView(false)}>
            Worker view
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-medium">Date</th>
                <th className="p-2 text-center">Available</th>
                <th className="p-2 text-center">Preferred</th>
                <th className="p-2 text-center">Unavailable</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const dayCells = workers.map((w) => cellMap.get(`${w.id}:${date}`));
                const counts = { available: 0, preferred: 0, unavailable: 0 };
                for (const c of dayCells) {
                  if (c?.status === "available") counts.available++;
                  if (c?.status === "preferred") counts.preferred++;
                  if (c?.status === "unavailable") counts.unavailable++;
                }
                return (
                  <tr key={date} className="border-t">
                    <td className="p-2">{format(parseISO(date), "EEE d MMM")}</td>
                    <td className="p-2 text-center text-success">{counts.available}</td>
                    <td className="p-2 text-center">{counts.preferred}</td>
                    <td className="p-2 text-center text-muted-foreground">
                      {counts.unavailable}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Worker availability (14 days)</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAggregateView(true)}>
          Aggregate view
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card p-2 text-left font-medium">Worker</th>
              {dates.map((date) => (
                <th key={date} className="p-2 text-center font-medium">
                  {format(parseISO(date), "EEE")}
                  <br />
                  <span className="text-muted-foreground">
                    {format(parseISO(date), "d")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className="border-t">
                <td className="sticky left-0 bg-card p-2 font-medium">{worker.name}</td>
                {dates.map((date) => {
                  const cell = cellMap.get(`${worker.id}:${date}`);
                  const variant = cell?.hasShift
                    ? "shifted"
                    : cell?.status ?? "not_submitted";
                  const styleKey = cell?.locked ? "locked" : variant;
                  return (
                    <td key={date} className="p-1">
                      <button
                        type="button"
                        disabled={cell?.locked || cell?.hasShift}
                        title={
                          cell?.status
                            ? `${cell.status}${cell.hasShift ? " (has shift)" : ""}`
                            : "Not submitted"
                        }
                        onClick={() => {
                          if (
                            cell?.status === "available" ||
                            cell?.status === "preferred"
                          ) {
                            onCreateShift?.(worker.id, date);
                          }
                        }}
                        className={cn(
                          "h-8 w-full min-w-[2rem] rounded-lg border transition-colors duration-150",
                          CELL_STYLES[styleKey] ?? CELL_STYLES.not_submitted
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-success/20" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-success/40" /> Preferred
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-muted" /> Unavailable
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-danger/20" /> Has shift
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
