import Link from "next/link";
import { endOfDay, format, startOfDay } from "date-fns";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { can, getPermissionContext } from "@/lib/primitives/rbac";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { createClient } from "@/lib/supabase/server";

export async function TodaysReminders() {
  const ctx = await getPermissionContext();
  if (!can(ctx, PermissionKey.REMINDER_VIEW)) {
    return null;
  }

  const supabase = await createClient();
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, title, due_at, category")
    .eq("organization_id", ctx.organization_id)
    .eq("status", "pending")
    .is("deleted_at", null)
    .gte("due_at", todayStart)
    .lte("due_at", todayEnd)
    .or(`assigned_to.eq.${ctx.user_id},created_by.eq.${ctx.user_id}`)
    .order("due_at", { ascending: true })
    .limit(5);

  const items = reminders ?? [];

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Today&apos;s reminders</CardTitle>
            <CardDescription>Due before midnight</CardDescription>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-xl">
          <Link href="/reminders">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No reminders today"
            description="You're clear for today. Add a reminder to track follow-ups."
            actionLabel="Add reminder"
            actionHref="/reminders"
            className="py-10"
          />
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2.5"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.due_at), "h:mm a")}
                    {r.category ? ` · ${r.category}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
