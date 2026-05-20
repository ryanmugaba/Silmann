import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIntegrations } from "@/lib/integrations/status";
import { Plug } from "lucide-react";

export default function IntegrationsDevPanel() {
  const integrations = getIntegrations();

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading flex items-center gap-2">
          <Plug className="h-5 w-5" strokeWidth={1.5} />
          Integrations (developer)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Internal checklist — not shown to end users. Configure keys in{" "}
          <code className="text-xs">.env.local</code> / Vercel.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {item.status === "setup_required" && item.setupHint ? (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                  Set: {item.setupHint}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={item.status === "active" ? "default" : "secondary"}
                className="rounded-lg capitalize"
              >
                {item.status === "setup_required" ? "setup required" : item.status}
              </Badge>
              {item.href && item.status === "setup_required" ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={item.href}>Configure</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
