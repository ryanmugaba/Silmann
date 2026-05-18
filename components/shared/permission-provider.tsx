"use client";

import { PermissionsReactContext } from "@/lib/primitives/rbac/hooks";
import type { PermissionContext } from "@/lib/primitives/rbac";

export type PermissionProviderProps = {
  children: React.ReactNode;
  value: PermissionContext;
};

/**
 * Supplies permission context to client components (sidebar gates, Can, useCan).
 * Load `value` from `getPermissionContext()` in a Server Component layout.
 */
export function PermissionProvider({
  children,
  value,
}: PermissionProviderProps) {
  return (
    <PermissionsReactContext.Provider value={value}>
      {children}
    </PermissionsReactContext.Provider>
  );
}
