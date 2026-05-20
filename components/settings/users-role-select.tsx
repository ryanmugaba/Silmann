"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Can } from "@/lib/primitives/rbac/hooks";
import { getAssignableRoles } from "@/lib/primitives/rbac/role-hierarchy";
import { PermissionKey, type Role } from "@/lib/primitives/rbac/types";
import { updateUserRole } from "@/app/(app)/settings/actions";
import { toast } from "sonner";

type UsersRoleSelectProps = {
  userId: string;
  role: string;
};

export function UsersRoleSelect({ userId, role }: UsersRoleSelectProps) {
  const currentRole = role as Role;
  const options = getAssignableRoles(currentRole);

  return (
    <Can
      permission={PermissionKey.USER_ROLE_CHANGE}
      fallback={
        <span className="capitalize text-muted-foreground">
          {role.replace(/_/g, " ")}
        </span>
      }
    >
      <Select
        value={role}
        onValueChange={async (value) => {
          const result = await updateUserRole(userId, value);
          if (result.error) toast.error(result.error);
          else toast.success("Role updated");
        }}
      >
        <SelectTrigger className="h-8 w-44 rounded-lg capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {options.map((r) => (
            <SelectItem key={r} value={r} className="capitalize">
              {r.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Can>
  );
}
