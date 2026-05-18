"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HouseProvider, type HouseOption } from "@/components/shared/house-context";
import { Sidebar } from "@/components/shared/sidebar";
import { TopBar } from "@/components/shared/top-bar";
import { MobileTabBar } from "@/components/shared/mobile-tab-bar";
import { DensityProvider, type Density } from "@/components/providers/density-provider";
import type { NotificationItem } from "@/components/shared/notifications-panel";

export type AppShellUser = {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
};

type AppShellProps = {
  children: React.ReactNode;
  user: AppShellUser;
  houses: HouseOption[];
  notifications?: NotificationItem[];
  density?: Density;
};

export function AppShell({
  children,
  user,
  houses,
  notifications = [],
  density = "comfortable",
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <DensityProvider density={density}>
      <HouseProvider houses={houses}>
        <TooltipProvider delayDuration={200}>
          <div className="flex min-h-screen bg-transparent">
            <Sidebar
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
            />
            <motion.div
              className="flex min-h-screen flex-1 flex-col"
              transition={{ duration: reducedMotion ? 0 : 0.15 }}
            >
              <TopBar
                user={user}
                notifications={notifications}
              />
              <main
                id="main-content"
                className="flex-1 overflow-auto p-[var(--density-padding)] pb-24 md:p-6 lg:p-8"
              >
                {children}
              </main>
            </motion.div>
            <MobileTabBar />
          </div>
        </TooltipProvider>
      </HouseProvider>
    </DensityProvider>
  );
}
