"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLES, type Role } from "@/lib/primitives/rbac/types";

export type TargetAudience = {
  roles: string[];
  houses: string[];
  userIds: string[];
};

type TargetAudienceBuilderProps = {
  value: TargetAudience;
  onChange: (value: TargetAudience) => void;
  houses: { id: string; name: string }[];
  users: { id: string; full_name: string | null }[];
};

export function TargetAudienceBuilder({
  value,
  onChange,
  houses,
  users,
}: TargetAudienceBuilderProps) {
  function toggleRole(role: Role, checked: boolean) {
    const roles = checked
      ? [...value.roles, role]
      : value.roles.filter((r) => r !== role);
    onChange({ ...value, roles });
  }

  function toggleHouse(id: string, checked: boolean) {
    const houseIds = checked
      ? [...value.houses, id]
      : value.houses.filter((h) => h !== id);
    onChange({ ...value, houses: houseIds });
  }

  function toggleUser(id: string, checked: boolean) {
    const userIds = checked
      ? [...value.userIds, id]
      : value.userIds.filter((u) => u !== id);
    onChange({ ...value, userIds });
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <p className="text-sm font-medium">Target audience</p>
      <p className="text-xs text-muted-foreground">
        Leave all unchecked to notify everyone in your organisation.
      </p>

      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Roles</Label>
        <div className="flex flex-wrap gap-3">
          {ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm capitalize">
              <Checkbox
                checked={value.roles.includes(role)}
                onCheckedChange={(c) => toggleRole(role, c === true)}
              />
              {role.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </div>

      {houses.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Houses</Label>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {houses.map((h) => (
              <label key={h.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.houses.includes(h.id)}
                  onCheckedChange={(c) => toggleHouse(h.id, c === true)}
                />
                {h.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {users.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">
            Individuals
          </Label>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {users.slice(0, 30).map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.userIds.includes(u.id)}
                  onCheckedChange={(c) => toggleUser(u.id, c === true)}
                />
                {u.full_name ?? u.id.slice(0, 8)}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
