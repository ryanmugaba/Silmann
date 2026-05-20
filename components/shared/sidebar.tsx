"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import {
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  ClipboardCheck,
  CircleHelp,
  LayoutDashboard,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  Bell,
  BarChart3,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Can, usePermissions } from "@/lib/primitives/rbac/hooks";
import { PermissionKey, type Role } from "@/lib/primitives/rbac/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  permission?: PermissionKey;
  roles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/roster",
    label: "Roster",
    icon: Calendar,
    permission: PermissionKey.ROSTER_VIEW,
  },
  {
    href: "/participants",
    label: "Participants",
    icon: ClipboardList,
    permission: PermissionKey.PARTICIPANT_VIEW,
  },
  {
    href: "/workers",
    label: "Workers",
    icon: Users,
    permission: PermissionKey.WORKER_VIEW,
  },
  {
    href: "/notice-board",
    label: "Notice Board",
    icon: Bell,
    permission: PermissionKey.NOTICE_BOARD_VIEW,
  },
  {
    href: "/messages",
    label: "Messages",
    icon: MessageSquare,
    permission: PermissionKey.MESSAGE_VIEW,
  },
  {
    href: "/reminders",
    label: "Reminders",
    icon: Clock,
    permission: PermissionKey.REMINDER_VIEW,
  },
  {
    href: "/incidents",
    label: "Incidents",
    icon: AlertTriangle,
    permission: PermissionKey.INCIDENT_VIEW,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    permission: PermissionKey.REPORT_VIEW,
  },
  {
    href: "/help",
    label: "Help",
    icon: CircleHelp,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    permission: PermissionKey.SETTINGS_VIEW,
  },
  {
    href: "/my-availability",
    label: "My availability",
    icon: CalendarDays,
    permission: PermissionKey.AVAILABILITY_SUBMIT,
    roles: ["support_worker"],
  },
  {
    href: "/my-compliance",
    label: "My compliance",
    icon: ClipboardCheck,
    permission: PermissionKey.COMPLIANCE_SUBMIT,
  },
];

type SidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function NavLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/15 text-primary shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const width = collapsed ? 64 : 240;
  const reducedMotion = useReducedMotion();
  const permissions = usePermissions();

  return (
    <motion.div
      className="hidden shrink-0 lg:block"
      style={{ width }}
      animate={{ width }}
      transition={{ duration: reducedMotion ? 0 : 0.15 }}
    >
      <aside className="sticky top-0 flex h-screen w-full flex-col border-r border-border/70 bg-card/80 shadow-header backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-3 shadow-sm">
          {!collapsed ? (
            <Link
              href="/dashboard"
              className="font-display text-lg font-semibold tracking-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              Silman
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="mx-auto font-display text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              aria-label="Silman home"
            >
              S
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
            )}
          </Button>
        </div>
        <ScrollArea className="flex-1 py-3">
          <nav className="flex flex-col gap-0.5 px-2" aria-label="Sidebar">
            {NAV_ITEMS.map((item) => {
              if (item.roles && !item.roles.includes(permissions.role)) {
                return null;
              }
              const link = (
                <NavLink key={item.href} item={item} collapsed={collapsed} />
              );
              if (item.permission) {
                return (
                  <Can key={item.href} permission={item.permission}>
                    {link}
                  </Can>
                );
              }
              return link;
            })}
          </nav>
        </ScrollArea>
      </aside>
    </motion.div>
  );
}
