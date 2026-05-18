"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ParticipantEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function ParticipantEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: ParticipantEmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/70 px-6 py-14 text-center shadow-card",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10">
        <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-heading text-balance">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-balance">{description}</p>
      {action ? <motion.div className="mt-6">{action}</motion.div> : null}
    </motion.div>
  );
}
