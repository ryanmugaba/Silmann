"use client";

import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCheck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  action_url: string | null;
};

type NotificationsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationItem[];
  onMarkAllRead?: () => void;
};

const TYPE_ICONS: Record<string, typeof Bell> = {
  shift: Calendar,
  incident: AlertTriangle,
  compliance: FileText,
  default: Bell,
};

function groupByDate(items: NotificationItem[]) {
  const groups: Record<string, NotificationItem[]> = {};
  for (const item of items) {
    const key = new Date(item.created_at).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export function NotificationsPanel({
  open,
  onOpenChange,
  notifications,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const grouped = groupByDate(notifications);
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>Notifications</SheetTitle>
            {hasUnread && onMarkAllRead ? (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                <CheckCheck className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                Mark all read
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Bell className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium">All caught up</p>
                <p className="text-sm text-muted-foreground">
                  Shift updates, compliance alerts, and team messages will appear here.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6 p-4">
                {Object.entries(grouped).map(([date, items]) => (
                  <div key={date}>
                    <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                      {date}
                    </p>
                    <ul className="space-y-1">
                      {items.map((item) => {
                        const Icon =
                          TYPE_ICONS[item.type] ?? TYPE_ICONS.default;
                        return (
                          <li
                            key={item.id}
                            className={cn(
                              "flex gap-3 rounded-2xl border p-3 transition-colors",
                              !item.read_at && "bg-accent/40"
                            )}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                              <Icon
                                className="h-4 w-4 text-muted-foreground"
                                strokeWidth={1.5}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{item.title}</p>
                              {item.body ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                  {item.body}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                              {item.action_url ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-auto p-0 text-xs"
                                  asChild
                                >
                                  <a href={item.action_url}>View</a>
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
