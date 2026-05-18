"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import { toast } from "sonner";
import { updateShiftTimes } from "@/app/(app)/roster/actions";
import { ShiftCreateModal, type ShiftCreateDefaults } from "@/components/roster/shift-create-modal";
import { ShiftDetailPanel } from "@/components/roster/shift-detail-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SHIFT_STATUS_COLORS, type ShiftRecord } from "@/lib/types/roster";

type HouseOption = { id: string; name: string };

export type RosterCalendarProps = {
  initialShifts: ShiftRecord[];
  houses: HouseOption[];
  isMock?: boolean;
};

type CalendarView = "dayGridDay" | "timeGridWeek" | "dayGridMonth";

export function RosterCalendar({
  initialShifts,
  houses,
  isMock,
}: RosterCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [shifts, setShifts] = useState(initialShifts);
  const [view, setView] = useState<CalendarView>("timeGridWeek");
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<ShiftCreateDefaults>();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showUnfilledOnly, setShowUnfilledOnly] = useState(false);

  const unfilledCount = shifts.filter((s) => s.status === "unfilled").length;

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (showUnfilledOnly && s.status !== "unfilled") return false;
      return true;
    });
  }, [shifts, showUnfilledOnly]);

  const events = useMemo(
    () =>
      filteredShifts.map((s) => ({
        id: s.id,
        title: s.workerName ?? `${s.houseName} · Unfilled`,
        start: s.startAt,
        end: s.endAt,
        backgroundColor: SHIFT_STATUS_COLORS[s.status],
        borderColor: SHIFT_STATUS_COLORS[s.status],
        extendedProps: { shift: s },
      })),
    [filteredShifts]
  );

  const refreshFromProps = useCallback(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  const handleEventClick = (info: EventClickArg) => {
    const shift = info.event.extendedProps.shift as ShiftRecord;
    setSelectedShift(shift);
    setDetailOpen(true);
  };

  const handleSelect = (info: DateSelectArg) => {
    setCreateDefaults({
      startAt: info.start,
      endAt: info.end,
      houseId: houses[0]?.id,
    });
    setCreateOpen(true);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const shift = info.event.extendedProps.shift as ShiftRecord;
    const fd = new FormData();
    fd.set("shiftId", shift.id);
    fd.set("startAt", info.event.start?.toISOString() ?? shift.startAt);
    fd.set(
      "endAt",
      info.event.end?.toISOString() ??
        new Date(
          (info.event.start?.getTime() ?? 0) +
            (new Date(shift.endAt).getTime() - new Date(shift.startAt).getTime())
        ).toISOString()
    );
    const result = await updateShiftTimes(fd);
    if (!result.success) {
      info.revert();
      toast.error(result.error);
    } else {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === shift.id
            ? {
                ...s,
                startAt: info.event.start!.toISOString(),
                endAt: info.event.end!.toISOString(),
              }
            : s
        )
      );
      toast.success("Shift moved");
    }
  };

  const goToday = () => calendarRef.current?.getApi().today();
  const changeView = (v: CalendarView) => {
    setView(v);
    calendarRef.current?.getApi().changeView(v);
  };

  return (
    <div className="space-y-4">
      {isMock ? (
        <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Showing demo roster data — connect Supabase to load live shifts.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border bg-card p-0.5">
          {(
            [
              ["dayGridDay", "Day"],
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
        <Button size="sm" variant="outline" onClick={goToday}>
          Today
        </Button>
        <Button
          size="sm"
          variant={showUnfilledOnly ? "default" : "outline"}
          onClick={() => setShowUnfilledOnly((v) => !v)}
        >
          Unfilled
          {unfilledCount > 0 ? (
            <Badge variant="destructive" className="ml-2">
              {unfilledCount}
            </Badge>
          ) : null}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setCreateDefaults({ houseId: houses[0]?.id });
            setCreateOpen(true);
          }}
        >
          Create shift
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-card [&_.fc]:text-sm">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          height="auto"
          contentHeight={640}
          events={events}
          editable
          selectable
          selectMirror
          eventClick={handleEventClick}
          select={handleSelect}
          eventDrop={handleEventDrop}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          nowIndicator
        />
      </div>

      <ShiftDetailPanel
        shift={selectedShift}
        currentUserId=""
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(s) => {
          setCreateDefaults({
            houseId: s.houseId,
            workerId: s.workerId ?? undefined,
            startAt: new Date(s.startAt),
            endAt: new Date(s.endAt),
            shiftType: s.shiftType,
          });
          setCreateOpen(true);
        }}
      />

      <ShiftCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        houses={houses}
        defaults={createDefaults}
        onCreated={refreshFromProps}
      />
    </div>
  );
}
