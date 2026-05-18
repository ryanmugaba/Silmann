"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsersRoleSelect } from "@/components/settings/users-role-select";
import { resendUserInvite, setUserActive } from "@/app/(app)/settings/actions";
import { toast } from "sonner";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
};

function UserActions({ user }: { user: UserRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-lg text-xs"
        onClick={() => {
          void setUserActive(user.id, !user.is_active).then((r) => {
            if (r.error) toast.error(r.error);
            else toast.success(user.is_active ? "Deactivated" : "Activated");
          });
        }}
      >
        {user.is_active ? "Deactivate" : "Activate"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 rounded-lg text-xs"
        onClick={() => {
          void resendUserInvite(user.id).then((r) => {
            if (r.error) toast.error(r.error);
            else toast.success("Invite email sent");
          });
        }}
      >
        Resend invite
      </Button>
    </div>
  );
}

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <article
            key={user.id}
            className="rounded-xl border bg-card p-4 shadow-card space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{user.full_name ?? "—"}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              <Badge
                variant={user.is_active ? "secondary" : "outline"}
                className="rounded-lg capitalize shrink-0"
              >
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <UsersRoleSelect userId={user.id} role={user.role} />
            <UserActions user={user} />
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3">{user.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <UsersRoleSelect userId={user.id} role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={user.is_active ? "secondary" : "outline"}
                    className="rounded-lg capitalize"
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <UserActions user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
