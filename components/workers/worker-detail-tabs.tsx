"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/compliance", label: "Compliance" },
  { href: "#certifications", label: "Certifications" },
  { href: "#availability", label: "Availability" },
  { href: "#shifts", label: "Shift history" },
  { href: "#rules", label: "Rules" },
  { href: "#activity", label: "Activity" },
] as const;

export function WorkerDetailTabs({ workerId }: { workerId: string }) {
  const pathname = usePathname();
  const base = `/workers/${workerId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-px">
      {TABS.map((tab) => {
        const href = tab.href ? `${base}${tab.href}` : base;
        const active =
          tab.href === "/compliance"
            ? pathname.endsWith("/compliance")
            : tab.href === ""
              ? pathname === base
              : false;

        if (tab.href.startsWith("#")) {
          return (
            <span
              key={tab.href}
              className="cursor-not-allowed whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm text-muted-foreground"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
