"use client";

import { useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, MapPin, User, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { cancelShift, requestShiftSwap } from "@/app/(app)/roster/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Can, useCan } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import {
  SHIFT_STATUS_COLORS,
  SHIFT_TYPE_LABELS,
  type ShiftRecord,
} from "@/lib/types/roster";
import { ShiftAuditLog } from "@/components/roster/shift-audit-log";
import { ShiftShiftComments } from "@/components/roster/shift-shift-comments";

export type ShiftDetailPanelProps = {
  shift: ShiftRecord | null;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (shift: ShiftRecord) => void;
};

export function ShiftDetailPanel({
  shift,
  currentUserId,
  open,
  onOpenChange,
  onEdit,
}: ShiftDetailPanelProps) {
  const [pending, startTransition] = useTransition();
  const canViewPay = useCan(PermissionKey.ROSTER_EDIT);

  if (!shift) return null;

  const statusColor = SHIFT_STATUS_COLORS[shift.status];
  const initials =
    shift.workerName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) ?? "?";

  const handleCancel = () => {
    const fd = new FormData();
    fd.set("shiftId", shift.id);
    startTransition(async () => {
      const result = await cancelShift(fd);
      if (result.success) {
        toast.success("Shift cancelled");
        onOpenChange(false);
      } else toast.error(result.error);
    });
  };

  const handleSwap = () => {
    const fd = new FormData();
    fd.set("shiftId", shift.id);
    fd.set("reason", "Swap requested from shift panel");
    startTransition(async () => {
      const result = await requestShiftSwap(fd);
      if (result.success) toast.success("Swap request submitted");
      else toast.error(result.error);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div
            className="mb-4 rounded-3xl border p-5 text-white shadow-card"
            style={{
              background: `linear-gradient(135deg, ${statusColor}, ${statusColor}cc)`,
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <Badge className="bg-white/20 text-white hover:bg-white/25">
                {shift.status.replace("_", " ")}
              </Badge>
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">
                {SHIFT_TYPE_LABELS[shift.shiftType]}
              </span>
            </div>
            <SheetTitle className="flex items-center gap-2 text-2xl text-white">
              <Calendar className="h-5 w-5" strokeWidth={1.5} />
              {format(parseISO(shift.startAt), "EEE d MMM")}
            </SheetTitle>
            <SheetDescription className="mt-1 text-white/80">
              {format(parseISO(shift.startAt), "h:mm a")} -{" "}
              {format(parseISO(shift.endAt), "h:mm a")} · {shift.houseName}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge
              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
            >
              {shift.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline">
              {SHIFT_TYPE_LABELS[shift.shiftType]}
            </Badge>
            <Badge variant="secondary">{shift.ratio}</Badge>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4 text-sm shadow-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" strokeWidth={1.5} />
              {shift.houseName}
            </p>
            {shift.participantName ? (
              <p className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                {shift.participantName}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border bg-muted/30 p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium">Assigned worker</p>
            {shift.workerId ? (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{shift.workerName}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">Unfilled shift</p>
                <Can permission={PermissionKey.ROSTER_EDIT}>
                  <Button size="sm" variant="outline" onClick={() => onEdit?.(shift)}>
                    <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Assign worker
                  </Button>
                </Can>
              </div>
            )}
          </div>

          {canViewPay ? (
            <div className="rounded-2xl border bg-card p-4 text-sm shadow-sm">
              <p className="font-medium">SCHADS classification</p>
              <p className="mt-1 text-muted-foreground">
                Ordinary hours · Penalty rates computed at payroll export
              </p>
            </div>
          ) : null}

          {shift.notes ? (
            <div className="rounded-2xl bg-muted/50 p-4 text-sm shadow-sm">
              <p className="font-medium">Notes</p>
              <p className="mt-1 text-muted-foreground">{shift.notes}</p>
            </div>
          ) : null}

          <ShiftShiftComments shiftId={shift.id} currentUserId={currentUserId} />
          <ShiftAuditLog shiftId={shift.id} />

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Can permission={PermissionKey.ROSTER_EDIT}>
              <Button size="sm" onClick={() => onEdit?.(shift)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSwap}
                disabled={pending}
              >
                Request swap
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={pending}
              >
                <X className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                Cancel
              </Button>
            </Can>
            <Can permission={PermissionKey.SHIFT_SWAP_REQUEST}>
              <Button size="sm" variant="outline" onClick={handleSwap} disabled={pending}>
                Request swap
              </Button>
            </Can>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
