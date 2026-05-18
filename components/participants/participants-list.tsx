"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { CountdownBadge } from "@/components/shared/countdown-badge";
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
import { computeCountdownStatus } from "@/lib/primitives/countdown/compute";
import { DEFAULT_PLAN_DATES } from "@/lib/primitives/countdown/types";
import { cn, formatDate } from "@/lib/utils";
import type { HouseRow, ParticipantRow } from "@/types/database";
import { ParticipantEmptyState } from "./empty-state";

export type ParticipantListItem = ParticipantRow & {
  house_name: string;
};

type ParticipantsListProps = {
  participants: ParticipantListItem[];
  houses: Pick<HouseRow, "id" | "name">[];
};

type SortKey = "name" | "plan_end";

export function ParticipantsList({
  participants,
  houses,
}: ParticipantsListProps) {
  const [search, setSearch] = useState("");
  const [houseFilter, setHouseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    let rows = [...participants];

    if (houseFilter !== "all") {
      rows = rows.filter((p) => p.house_id === houseFilter);
    }
    if (statusFilter !== "all") {
      rows = rows.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.ndis_number.toLowerCase().includes(q) ||
          (p.preferred_name?.toLowerCase().includes(q) ?? false)
      );
    }

    rows.sort((a, b) => {
      if (sort === "plan_end") {
        const aDate = a.plan_end_date ?? "";
        const bDate = b.plan_end_date ?? "";
        return aDate.localeCompare(bDate);
      }
      return a.full_name.localeCompare(b.full_name);
    });

    return rows;
  }, [participants, houseFilter, statusFilter, search, sort]);

  return (
    <motion.div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            placeholder="Search by name or NDIS number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg pl-9"
          />
        </div>
        <Select value={houseFilter} onValueChange={setHouseFilter}>
          <SelectTrigger className="w-full rounded-lg sm:w-[180px]">
            <SelectValue placeholder="House" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All houses</SelectItem>
            {houses.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full rounded-lg sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full rounded-lg sm:w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="plan_end">Sort: Plan end</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <ParticipantEmptyState
          icon={Users}
          title={participants.length === 0 ? "No participants yet" : "No matches"}
          description={
            participants.length === 0
              ? "Add your first NDIS participant to start managing plans, medications, and rostering rules."
              : "Try adjusting your search or filters."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="px-4 py-3 font-medium">Participant</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  NDIS number
                </th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  House
                </th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Plan
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const planCountdown = p.plan_end_date
                  ? computeCountdownStatus(
                      {
                        expiry_date: p.plan_end_date,
                        thresholds: DEFAULT_PLAN_DATES.thresholds,
                        severity_per_threshold:
                          DEFAULT_PLAN_DATES.severity_per_threshold,
                        status: "active",
                      },
                      new Date()
                    )
                  : null;

                const initials = p.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={p.id}
                    className="group border-b last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/participants/${p.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="h-9 w-9">
                          {p.photo_url ? (
                            <AvatarImage src={p.photo_url} alt="" />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium group-hover:text-primary">
                            {p.full_name}
                          </span>
                          {p.preferred_name ? (
                            <p className="text-xs text-muted-foreground">
                              {p.preferred_name}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {p.ndis_number}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {p.house_name}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {p.plan_end_date ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">
                            {formatDate(p.plan_end_date)}
                          </span>
                          {planCountdown ? (
                            <CountdownBadge
                              daysRemaining={planCountdown.days_remaining}
                              severity={planCountdown.severity}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          p.status === "active" && "border-success/30 text-success",
                          p.status === "inactive" && "text-muted-foreground"
                        )}
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
