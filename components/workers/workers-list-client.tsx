"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkerComplianceSummary, WorkerListItem } from "@/lib/types/workers";

const COMPLIANCE_BADGE: Record<
  WorkerComplianceSummary,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  compliant: { label: "Compliant", variant: "default" },
  expiring: { label: "Expiring", variant: "secondary" },
  non_compliant: { label: "Non-compliant", variant: "destructive" },
};

export function WorkersListClient({
  workers,
  isMock,
}: {
  workers: WorkerListItem[];
  isMock?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        w.fullName.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q);
      const matchesCompliance =
        complianceFilter === "all" || w.complianceSummary === complianceFilter;
      return matchesSearch && matchesCompliance;
    });
  }, [workers, search, complianceFilter]);

  return (
    <div className="space-y-4">
      {isMock ? (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Demo worker data — connect Supabase for live records.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="pl-9"
          />
        </div>
        <Select value={complianceFilter} onValueChange={setComplianceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Compliance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All compliance</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="non_compliant">Non-compliant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="p-4 font-medium">Worker</th>
              <th className="p-4 font-medium">Houses</th>
              <th className="p-4 font-medium">Compliance</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((worker) => {
              const badge = COMPLIANCE_BADGE[worker.complianceSummary];
              const initials = worker.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2);
              return (
                <tr
                  key={worker.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="p-4">
                    <Link
                      href={`/workers/${worker.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={worker.avatarUrl ?? undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{worker.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {worker.email}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {worker.houseNames.join(", ") || "—"}
                  </td>
                  <td className="p-4">
                    <Badge variant={badge.variant}>
                      {badge.label}
                      {worker.pendingDocCount > 0
                        ? ` · ${worker.pendingDocCount} pending`
                        : ""}
                    </Badge>
                  </td>
                  <td className="p-4 capitalize text-muted-foreground">
                    {worker.status.replace("_", " ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
