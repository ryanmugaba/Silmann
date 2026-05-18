"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CommandPalette } from "@/components/shared/command-palette";
import {
  NotificationsPanel,
  type NotificationItem,
} from "@/components/shared/notifications-panel";
import { useHouseContext } from "@/components/shared/house-context";
import type { AppShellUser } from "@/components/shared/app-shell";

type TopBarProps = {
  user: AppShellUser;
  onToggleSidebar: () => void;
  notifications?: NotificationItem[];
};

export function TopBar({
  user,
  onToggleSidebar,
  notifications = [],
}: TopBarProps) {
  const { houses, activeHouse, setActiveHouseId } = useHouseContext();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState(notifications);

  const unreadCount = localNotifications.filter((n) => !n.read_at).length;
  const initials =
    user.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? user.email[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-sm md:gap-4 md:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="hidden shrink-0 lg:inline-flex"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        <div className="relative hidden max-w-md flex-1 md:block">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            readOnly
            onClick={() => setCommandOpen(true)}
            placeholder="Search… (⌘K)"
            className="cursor-pointer bg-muted/40 pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {houses.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4" strokeWidth={1.5} />
                  <span className="max-w-[120px] truncate">
                    {activeHouse?.name ?? "All houses"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Active house</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {houses.length > 1 ? (
                  <DropdownMenuItem onClick={() => setActiveHouseId(null)}>
                    All houses
                  </DropdownMenuItem>
                ) : null}
                {houses.map((house) => (
                  <DropdownMenuItem
                    key={house.id}
                    onClick={() => setActiveHouseId(house.id)}
                  >
                    {house.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => setNotificationsOpen(true)}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            {unreadCount > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            ) : null}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 pl-1 pr-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
                  {user.fullName ?? user.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{user.fullName ?? "Account"}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/settings/profile">
                  <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/settings">
                  <Settings className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => void signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      <NotificationsPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={localNotifications}
        onMarkAllRead={() =>
          setLocalNotifications((items) =>
            items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
          )
        }
      />
    </>
  );
}
