"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  ALL_PERMISSION_KEYS,
  PermissionKey,
  ROLES,
  type Role,
} from "@/lib/primitives/rbac/types";
import { roleHasDefaultPermission } from "@/lib/primitives/rbac/default-permissions";
import { Can } from "@/lib/primitives/rbac/hooks";
import { setPermissionGrant } from "@/app/(app)/settings/actions";
import { toast } from "sonner";

type Grant = {
  role_name: string;
  permission_key: string;
  granted: boolean;
};

export function PermissionsMatrix({ grants }: { grants: Grant[] }) {
  const grantMap = new Map(
    grants.map((g) => [`${g.role_name}:${g.permission_key}`, g.granted])
  );

  function isGranted(role: Role, key: PermissionKey): boolean {
    const override = grantMap.get(`${role}:${key}`);
    if (override !== undefined) return override;
    return roleHasDefaultPermission(role, key);
  }

  async function toggle(role: Role, key: PermissionKey, checked: boolean) {
    const result = await setPermissionGrant(role, key, checked);
    if (result.error) toast.error(result.error);
  }

  const displayKeys = ALL_PERMISSION_KEYS.slice(0, 12);

  return (
    <Can
      permission={PermissionKey.SETTINGS_EDIT}
      fallback={
        <p className="text-sm text-muted-foreground">
          Only owners can edit the permission matrix.
        </p>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-2 text-left font-medium">Permission</th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className="px-2 py-2 text-center font-medium capitalize"
                >
                  {role.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayKeys.map((key) => (
              <tr key={key} className="border-b">
                <td className="px-2 py-2 text-muted-foreground">{key}</td>
                {ROLES.map((role) => (
                  <td key={`${role}-${key}`} className="px-2 py-2 text-center">
                    <Checkbox
                      checked={isGranted(role, key)}
                      onCheckedChange={(c) =>
                        void toggle(role, key, c === true)
                      }
                      aria-label={`${role} ${key}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Showing core permissions. Custom grants override role defaults.
        </p>
      </div>
    </Can>
  );
}
