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
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-14 text-center shadow-card",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-heading">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <motion.div className="mt-6">{action}</motion.div> : null}
    </motion.div>
  );
}
