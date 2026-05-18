"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { History } from "lucide-react";
import { getShiftDetailMeta } from "@/app/(app)/roster/actions";
import { Skeleton } from "@/components/ui/skeleton";

type AuditEntry = {
  action: string;
  user_name: string;
  created_at: string;
};

export function ShiftAuditLog({ shiftId }: { shiftId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getShiftDetailMeta(shiftId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data?.audit) {
        setEntries(result.data.audit);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  if (loading) {
    return <Skeleton className="h-20 w-full rounded-xl" />;
  }

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border p-4 text-sm">
      <p className="mb-2 flex items-center gap-2 font-medium">
        <History className="h-4 w-4" strokeWidth={1.5} />
        Activity
      </p>
      <ul className="space-y-1.5 text-muted-foreground">
        {entries.map((e, i) => (
          <li key={`${e.created_at}-${i}`}>
            <span className="capitalize text-foreground">{e.action}</span> by{" "}
            {e.user_name} · {format(parseISO(e.created_at), "d MMM h:mm a")}
          </li>
        ))}
      </ul>
    </div>
  );
}
