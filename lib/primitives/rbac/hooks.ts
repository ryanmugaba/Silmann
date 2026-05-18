"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { can } from "./check";
import type { PermissionContext, PermissionKey, ResourceScope } from "./types";

export const PermissionsReactContext =
  createContext<PermissionContext | null>(null);

export function usePermissions(): PermissionContext {
  const context = useContext(PermissionsReactContext);
  if (!context) {
    throw new Error(
      "usePermissions must be used within a PermissionProvider"
    );
  }
  return context;
}

export function useCan(
  permission: PermissionKey,
  resource?: ResourceScope
): boolean {
  const context = usePermissions();
  return useMemo(
    () => can(context, permission, resource),
    [
      context,
      permission,
      resource,
    ]
  );
}

export type CanProps = {
  permission: PermissionKey;
  resource?: ResourceScope;
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({
  permission,
  resource,
  children,
  fallback = null,
}: CanProps): ReactNode {
  const allowed = useCan(permission, resource);
  if (!allowed) {
    return fallback;
  }
  return children;
}
