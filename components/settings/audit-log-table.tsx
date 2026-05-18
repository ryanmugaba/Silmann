"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  user_name: string;
};

export function AuditLogTable({ logs }: { logs: AuditLogRow[] }) {
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const entityTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (
        userFilter &&
        !log.user_name.toLowerCase().includes(userFilter.toLowerCase())
      ) {
        return false;
      }
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }
      if (entityFilter !== "all" && log.entity_type !== entityFilter) {
        return false;
      }
      return true;
    });
  }, [logs, userFilter, actionFilter, entityFilter]);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">User</Label>
          <Input
            placeholder="Filter by name…"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-lg"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Entity type</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All entities</SelectItem>
              {entityTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {format(new Date(log.created_at), "d MMM yyyy HH:mm")}
                </td>
                <td className="px-4 py-3">{log.user_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {log.entity_type}
                  {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching audit entries.</p>
      ) : null}
    </div>
  );
}
