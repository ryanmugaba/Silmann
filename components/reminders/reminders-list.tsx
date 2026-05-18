"use client";

import { format } from "date-fns";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { completeReminder } from "@/app/(app)/reminders/actions";
import type { ReminderWithAssignee } from "@/types/reminders";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RemindersListProps = {
  title: string;
  reminders: ReminderWithAssignee[];
  showComplete?: boolean;
};

export function RemindersList({
  title,
  reminders,
  showComplete = false,
}: RemindersListProps) {
  if (reminders.length === 0) return null;

  async function handleComplete(id: string) {
    const result = await completeReminder(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Reminder completed");
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold tracking-heading">
        {title}
      </h2>
      <div className="space-y-2">
        {reminders.map((reminder) => (
          <Card
            key={reminder.id}
            className={cn(
              "shadow-card transition-colors",
              reminder.status === "completed" && "opacity-60"
            )}
          >
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{reminder.title}</p>
                  {reminder.category ? (
                    <Badge variant="secondary" className="rounded-lg text-xs">
                      {reminder.category}
                    </Badge>
                  ) : null}
                </div>
                {reminder.description ? (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {reminder.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Due {format(new Date(reminder.due_at), "d MMM yyyy, h:mm a")}
                  {reminder.assignee_name
                    ? ` · ${reminder.assignee_name}`
                    : ""}
                  {reminder.house_name ? ` · ${reminder.house_name}` : ""}
                </p>
              </div>
              {!showComplete && reminder.status === "pending" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-xl"
                  onClick={() => void handleComplete(reminder.id)}
                  aria-label="Mark complete"
                  type="button"
                >
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
