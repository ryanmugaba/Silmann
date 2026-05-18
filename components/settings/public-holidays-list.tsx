import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Holiday = {
  id: string;
  date: string;
  name: string;
  state: string | null;
};

export function PublicHolidaysList({ holidays }: { holidays: Holiday[] }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base font-display tracking-heading">
          Public holidays (NSW seed)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No holidays loaded. Run database migrations to seed NSW holidays.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span>{h.name}</span>
                <span className="text-muted-foreground">
                  {format(parseISO(h.date), "d MMM yyyy")}
                  {h.state ? ` · ${h.state}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
