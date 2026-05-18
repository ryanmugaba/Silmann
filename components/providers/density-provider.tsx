"use client";

import { useEffect } from "react";

export type Density = "compact" | "comfortable" | "spacious";

export function DensityProvider({
  density = "comfortable",
  children,
}: {
  density?: Density;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  return <>{children}</>;
}
