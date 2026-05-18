import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CircleHelp,
  FileWarning,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PendingComplianceWidget } from "@/components/dashboard/pending-compliance-widget";
import { createClient } from "@/lib/supabase/server";
import { getPermissionContext } from "@/lib/primitives/rbac/server";
import { can } from "@/lib/primitives/rbac/check";
import { PermissionKey } from "@/lib/primitives/rbac/types";
import { listPendingCompliance } from "@/lib/data/workers-queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const ctx = await getPermissionContext();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single<{ full_name: string | null }>();

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const pendingCompliance = can(ctx, PermissionKey.COMPLIANCE_APPROVE)
    ? await listPendingCompliance(ctx.organization_id)
    : { documents: [], isMock: false };

  const widgets = [
    {
      title: "Unfilled shifts",
      description: "Shifts in the next 7 days without an assigned worker.",
      icon: Calendar,
      empty: "No unfilled shifts — your roster is fully covered.",
      href: "/roster",
    },
    {
      title: "Expiring documents",
      description: "Plans, scripts, and compliance items approaching expiry.",
      icon: FileWarning,
      empty: "No documents expiring soon. Countdown alerts will appear here.",
      href: "/participants",
    },
    {
      title: "AI nudges",
      description: "Run operational work from natural-language prompts.",
      icon: Sparkles,
      empty: "Press Ctrl/Command+K and ask Silman to roster, remind, invite, or post.",
      href: "/help",
      action: "Learn AI prompts",
    },
    {
      title: "Today's incidents",
      description: "Open incidents requiring follow-up today.",
      icon: AlertTriangle,
      empty: "No open incidents for today.",
      href: "/incidents",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-heading">
          Good {getGreeting()}, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what needs attention across your SIL houses today.
        </p>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-transparent shadow-card">
        <CardHeader className="pb-4">
          <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
            Prompt-first operations
          </div>
          <CardTitle className="text-xl">Run Silman from a sentence</CardTitle>
          <CardDescription>
            Press Ctrl/Command+K and type things like “roster Sarah at Parramatta
            SIL on 13 June” or “remind me to review Alex&apos;s plan tomorrow”.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/help">
              <CircleHelp className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Learn how it works
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/roster">
              <Wand2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Open roster
            </Link>
          </Button>
        </CardContent>
      </Card>

      <PendingComplianceWidget
        documents={pendingCompliance.documents}
        isMock={pendingCompliance.isMock}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {widgets.map((widget) => {
          const Icon = widget.icon;
          return (
            <Card key={widget.title} className="shadow-card">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{widget.title}</CardTitle>
                  <CardDescription>{widget.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">{widget.empty}</p>
                  <Button asChild variant="ghost" size="sm" className="mt-2">
                    <Link href={widget.href}>
                      {"action" in widget ? widget.action : "Open module"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
