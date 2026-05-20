"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building,
  CreditCard,
  Home,
  KeyRound,
  ScrollText,
  Shield,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Can } from "@/lib/primitives/rbac/hooks";
import { PermissionKey } from "@/lib/primitives/rbac/types";

const NAV = [
  {
    href: "/settings/billing",
    label: "Billing",
    icon: CreditCard,
    permission: PermissionKey.BILLING_MANAGE,
  },
  {
    href: "/settings/organization",
    label: "Organisation",
    icon: Building,
    permission: PermissionKey.ORG_VIEW,
  },
  {
    href: "/settings/users",
    label: "Users",
    icon: Users,
    permission: PermissionKey.USER_INVITE,
  },
  {
    href: "/settings/houses",
    label: "Houses",
    icon: Home,
    permission: PermissionKey.HOUSE_VIEW,
  },
  {
    href: "/settings/permissions",
    label: "Permissions",
    icon: Shield,
    permission: PermissionKey.SETTINGS_EDIT,
  },
  {
    href: "/settings/custom-roles",
    label: "Custom roles",
    icon: KeyRound,
    permission: PermissionKey.CUSTOM_ROLE_MANAGE,
  },
  {
    href: "/settings/audit-log",
    label: "Audit log",
    icon: ScrollText,
    permission: PermissionKey.AUDIT_LOG_VIEW,
  },
  {
    href: "/settings/profile",
    label: "Profile",
    icon: User,
    permission: PermissionKey.PROFILE_VIEW_OWN,
  },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        const link = (
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
            {item.label}
          </Link>
        );

        return (
          <Can key={item.href} permission={item.permission}>
            {link}
          </Can>
        );
      })}
    </nav>
  );
}
