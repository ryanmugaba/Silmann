"use client";

import { useReducedMotion } from "framer-motion";

/** Framer Motion transition that respects prefers-reduced-motion. */
export function useMotionTransition(
  duration = 0.15
): { duration: number } | { duration: 0 } {
  const reduced = useReducedMotion();
  return { duration: reduced ? 0 : duration };
}

export function motionProps(reduced: boolean | null) {
  if (reduced) {
    return { initial: false, animate: false, exit: false, transition: { duration: 0 } };
  }
  return {};
}
