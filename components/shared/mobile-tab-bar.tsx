"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Clock,
  CircleHelp,
  LayoutDashboard,
  Menu,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  {
    href: "/roster",
    label: "Roster",
    icon: Calendar,
    permission: PermissionKey.ROSTER_VIEW,
  },
  {
    href: "/messages",
    label: "Chat",
    icon: MessageSquare,
    permission: PermissionKey.MESSAGE_VIEW,
  },
  {
    href: "/reminders",
    label: "Tasks",
    icon: Clock,
    permission: PermissionKey.REMINDER_VIEW,
  },
] as const;

const MORE_LINKS = [
  { href: "/participants", label: "Participants", permission: PermissionKey.PARTICIPANT_VIEW },
  { href: "/workers", label: "Workers", permission: PermissionKey.WORKER_VIEW },
  { href: "/notice-board", label: "Notice board", permission: PermissionKey.NOTICE_BOARD_VIEW },
  { href: "/my-compliance", label: "My compliance", permission: PermissionKey.COMPLIANCE_SUBMIT },
  { href: "/settings", label: "Settings", permission: PermissionKey.SETTINGS_VIEW },
];

const ALWAYS_LINKS = [
  { href: "/help", label: "Help", icon: CircleHelp },
];

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        active
          ? "text-primary before:absolute before:top-1 before:h-1 before:w-8 before:rounded-full before:bg-primary/20"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-header backdrop-blur-xl lg:hidden"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-stretch">
        {PRIMARY_TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const link = (
            <TabLink
              key={tab.href}
              href={tab.href}
              label={tab.label}
              icon={tab.icon}
              active={active}
            />
          );
          if ("permission" in tab && tab.permission) {
            return (
              <Can key={tab.href} permission={tab.permission}>
                {link}
              </Can>
            );
          }
          return link;
        })}

        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-auto min-w-0 flex-1 flex-col items-center gap-0.5 rounded-none px-1 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-label="More navigation"
              type="button"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
              <span>More</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>More</DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="max-h-[50vh] px-4 pb-8">
              <ul className="space-y-1">
                {MORE_LINKS.map((item) => (
                  <li key={item.href}>
                    <Can permission={item.permission}>
                      <Link
                        href={item.href}
                        className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.label}
                      </Link>
                    </Can>
                  </li>
                ))}
                {ALWAYS_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
