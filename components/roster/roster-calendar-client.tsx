"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarApi, EventClickArg, DateSelectArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import type { EventDropArg } from "@fullcalendar/core";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getShiftsForRange, updateShiftTimes } from "@/app/(app)/roster/actions";
import { ShiftCreateModal, type ShiftCreateDefaults } from "@/components/roster/shift-create-modal";
import { ShiftDetailPanel } from "@/components/roster/shift-detail-panel";
import { WorkerAvailabilityGrid } from "@/components/roster/worker-availability-grid";
import { useHouse } from "@/components/shared/house-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Can, useCan } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import {
  SHIFT_STATUSES,
  SHIFT_STATUS_COLORS,
  SHIFT_TYPES,
  SHIFT_TYPE_LABELS,
  type ShiftRecord,
  type ShiftStatus,
  type ShiftType,
  type WorkerAvailabilityCell,
} from "@/lib/types/roster";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

type HouseOption = { id: string; name: string };

export type RosterCalendarClientProps = {
  organizationId: string;
  currentUserId: string;
  initialShifts: ShiftRecord[];
  availabilityCells: WorkerAvailabilityCell[];
  houses: HouseOption[];
  isMock?: boolean;
};

function toCalendarEvent(shift: ShiftRecord) {
  const title = shift.workerName
    ? `${shift.workerName} · ${shift.houseName}`
    : `Unfilled · ${shift.houseName}`;
  return {
    id: shift.id,
    title,
    start: shift.startAt,
    end: shift.endAt,
    backgroundColor: SHIFT_STATUS_COLORS[shift.status],
    borderColor: SHIFT_STATUS_COLORS[shift.status],
    extendedProps: { shift },
  };
}

export function RosterCalendarClient({
  organizationId,
  currentUserId,
  initialShifts,
  availabilityCells,
  houses,
  isMock: initialMock,
}: RosterCalendarClientProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { activeHouseId } = useHouse();
  const canCreate = useCan(PermissionKey.ROSTER_CREATE);
  const canEdit = useCan(PermissionKey.ROSTER_EDIT);

  const [shifts, setShifts] = useState(initialShifts);
  const [isMock, setIsMock] = useState(initialMock ?? false);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [view, setView] = useState<CalendarView>("timeGridWeek");
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ShiftType | "all">("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [unfilledOnly, setUnfilledOnly] = useState(false);
  const visibleRangeRef = useRef<{ start: string; end: string } | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [jumpDate, setJumpDate] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<ShiftCreateDefaults>();
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  const workerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shifts) {
      if (s.workerId && s.workerName) {
        map.set(s.workerId, s.workerName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [shifts]);

  const refreshShiftsForRange = useCallback(
    async (start: Date, end: Date) => {
      const result = await getShiftsForRange(start.toISOString(), end.toISOString());
      if (result.success && result.data) {
        setShifts(result.data.shifts);
        setIsMock(result.data.isMock);
      }
    },
    []
  );

  useEffect(() => {
    if (isMock || !organizationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`shifts-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shifts",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          const range = visibleRangeRef.current;
          if (range) {
            void refreshShiftsForRange(new Date(range.start), new Date(range.end));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, isMock, refreshShiftsForRange]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (activeHouseId && s.houseId !== activeHouseId) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (typeFilter !== "all" && s.shiftType !== typeFilter) return false;
      if (workerFilter !== "all" && s.workerId !== workerFilter) return false;
      if (unfilledOnly && s.status !== "unfilled") return false;
      return true;
    });
  }, [shifts, activeHouseId, statusFilter, typeFilter, workerFilter, unfilledOnly]);

  const unfilledCount = useMemo(
    () =>
      shifts.filter(
        (s) =>
          s.status === "unfilled" &&
          (!activeHouseId || s.houseId === activeHouseId)
      ).length,
    [shifts, activeHouseId]
  );

  const events = useMemo(
    () => filteredShifts.map(toCalendarEvent),
    [filteredShifts]
  );

  const getApi = useCallback((): CalendarApi | null => {
    return calendarRef.current?.getApi() ?? null;
  }, []);

  const goToday = useCallback(() => getApi()?.today(), [getApi]);
  const goPrev = useCallback(() => getApi()?.prev(), [getApi]);
  const goNext = useCallback(() => getApi()?.next(), [getApi]);

  const changeView = (v: CalendarView) => {
    setView(v);
    getApi()?.changeView(v);
  };

  useEffect(() => {
    if (!isMobile) return;
    setView("timeGridDay");
    getApi()?.changeView("timeGridDay");
  }, [isMobile, getApi]);

  const handleDateSelect = (info: DateSelectArg) => {
    if (!canCreate) return;
    setCreateDefaults({
      houseId: activeHouseId ?? houses[0]?.id,
      startAt: info.start,
      endAt: info.end,
    });
    setCreateOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const shift = info.event.extendedProps.shift as ShiftRecord;
    setSelectedShift(shift);
    setDetailOpen(true);
  };

  const persistTimeChange = (shiftId: string, start: Date, end: Date) => {
    const fd = new FormData();
    fd.set("shiftId", shiftId);
    fd.set("startAt", start.toISOString());
    fd.set("endAt", end.toISOString());
    startTransition(async () => {
      const result = await updateShiftTimes(fd);
      if (result.success) {
        setShifts((prev) =>
          prev.map((s) =>
            s.id === shiftId
              ? { ...s, startAt: start.toISOString(), endAt: end.toISOString() }
              : s
          )
        );
        toast.success("Shift updated");
      } else {
        toast.error(result.error);
        getApi()?.refetchEvents();
      }
    });
  };

  const handleEventDrop = (info: EventDropArg) => {
    if (!canEdit || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    persistTimeChange(info.event.id, info.event.start, info.event.end);
  };

  const handleEventResize = (info: EventResizeDoneArg) => {
    if (!canEdit || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    persistTimeChange(info.event.id, info.event.start, info.event.end);
  };

  const openCreateAtNow = () => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
    setCreateDefaults({
      houseId: activeHouseId ?? houses[0]?.id,
      startAt: start,
      endAt: end,
    });
    setCreateOpen(true);
  };

  const handleAvailabilityCreate = (workerId: string, date: string) => {
    const start = new Date(`${date}T07:00:00`);
    const end = new Date(`${date}T15:00:00`);
    setCreateDefaults({
      workerId,
      houseId: activeHouseId ?? houses[0]?.id,
      startAt: start,
      endAt: end,
    });
    setCreateOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        goToday();
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        goNext();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setDatePickerOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, goToday]);

  const handleJumpDate = () => {
    if (!jumpDate) return;
    getApi()?.gotoDate(jumpDate);
    setDatePickerOpen(false);
    setJumpDate("");
  };

  return (
    <div className="space-y-6">
      {isMock ? (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Demo roster data â€” connect Supabase for live shifts and real-time updates.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          {datePickerOpen ? (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={jumpDate}
                onChange={(e) => setJumpDate(e.target.value)}
                className="w-40"
                aria-label="Jump to date"
              />
              <Button size="sm" onClick={handleJumpDate}>
                Go
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDatePickerOpen(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setDatePickerOpen(true)}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Jump to date
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border bg-muted/30 p-0.5">
            {(
              [
                ["timeGridDay", "Day"],
                ["timeGridWeek", "Week"],
                ["dayGridMonth", "Month"],
              ] as const
            ).map(([v, label]) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? "secondary" : "ghost"}
                className="rounded-lg"
                onClick={() => changeView(v)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Can permission={PermissionKey.ROSTER_CREATE}>
            <Button onClick={openCreateAtNow}>
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create shift
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ShiftStatus | "all")}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {SHIFT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as ShiftType | "all")}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Shift type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {SHIFT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {SHIFT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {workerOptions.length > 0 ? (
          <Select value={workerFilter} onValueChange={setWorkerFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Worker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workers</SelectItem>
              {workerOptions.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          size="sm"
          variant={unfilledOnly ? "destructive" : "outline"}
          onClick={() => setUnfilledOnly((v) => !v)}
        >
          Unfilled
          {unfilledCount > 0 ? (
            <Badge variant="secondary" className="ml-2 bg-white/20">
              {unfilledCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <Can permission={PermissionKey.ROSTER_VIEW}>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </Can>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <div
            className={cn(
              "overflow-hidden rounded-2xl border bg-card p-2 shadow-card",
              "[&_.fc]:font-sans [&_.fc-toolbar-title]:font-display [&_.fc-toolbar-title]:text-lg",
              "[&_.fc-event]:rounded-lg [&_.fc-event]:border-0 [&_.fc-event]:text-xs [&_.fc-event]:font-medium",
              "[&_.fc-col-header-cell]:text-xs [&_.fc-timegrid-slot-label]:text-xs"
            )}
          >
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              headerToolbar={{
                left: "",
                center: "title",
                right: "",
              }}
              height="auto"
              contentHeight={560}
              events={events}
              editable={canEdit}
              selectable={canCreate}
              selectMirror
              dayMaxEvents
              nowIndicator
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
              allDaySlot={false}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              datesSet={(arg) => {
                visibleRangeRef.current = {
                  start: arg.start.toISOString(),
                  end: arg.end.toISOString(),
                };
                void refreshShiftsForRange(arg.start, arg.end);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <WorkerAvailabilityGrid
            cells={availabilityCells}
            onCreateShift={canCreate ? handleAvailabilityCreate : undefined}
          />
        </TabsContent>
      </Tabs>

      <ShiftCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        houses={houses}
        defaults={createDefaults}
        onCreated={() => {
          setCreateOpen(false);
          const range = visibleRangeRef.current;
          if (range) {
            void refreshShiftsForRange(new Date(range.start), new Date(range.end));
          }
        }}
      />

      <ShiftDetailPanel
        shift={selectedShift}
        currentUserId={currentUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(shift) => {
          setDetailOpen(false);
          setCreateDefaults({
            houseId: shift.houseId,
            workerId: shift.workerId ?? undefined,
            participantId: shift.participantId ?? undefined,
            startAt: new Date(shift.startAt),
            endAt: new Date(shift.endAt),
            shiftType: shift.shiftType,
          });
          setCreateOpen(true);
        }}
      />

      <p className="text-xs text-muted-foreground">
        Shortcuts: <kbd className="rounded bg-muted px-1">T</kbd> today,{" "}
        <kbd className="rounded bg-muted px-1">J</kbd>/<kbd className="rounded bg-muted px-1">K</kbd>{" "}
        navigate, <kbd className="rounded bg-muted px-1">G</kbd> jump to date
      </p>
    </div>
  );
}
