"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ExportKind = "roster" | "compliance" | "audit" | "incidents";

const EXPORTS: {
  type: ExportKind;
  title: string;
  description: string;
}[] = [
  {
    type: "roster",
    title: "Roster coverage",
    description: "Shifts in the selected date range with house, worker, and status.",
  },
  {
    type: "compliance",
    title: "Compliance submissions",
    description: "Worker documents submitted in the selected date range.",
  },
  {
    type: "audit",
    title: "Audit log",
    description: "User actions recorded in the selected date range (up to 5,000 rows).",
  },
  {
    type: "incidents",
    title: "Incident register",
    description: "Incidents recorded in the selected date range.",
  },
];

export function ReportsExportPanel({ canExport }: { canExport: boolean }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState<ExportKind | null>(null);

  const download = async (type: ExportKind) => {
    if (!from || !to) {
      toast.error("Select a date range");
      return;
    }
    setLoading(type);
    try {
      const params = new URLSearchParams({ type, from, to });
      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) {
        toast.error("Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `silman-${type}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  if (!canExport) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 text-sm text-muted-foreground">
          You do not have permission to export reports. Ask your organisation owner
          for access.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Date range</CardTitle>
          <CardDescription>Exports use UTC boundaries for the selected dates.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label htmlFor="export-from">From</Label>
            <Input
              id="export-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-[180px] rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="export-to">To</Label>
            <Input
              id="export-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-[180px] rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EXPORTS.map((item) => (
          <Card key={item.type} className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full rounded-xl"
                variant="outline"
                disabled={loading !== null}
                onClick={() => void download(item.type)}
              >
                <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {loading === item.type ? "Preparing…" : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
