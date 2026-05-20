"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StatusResponse = {
  ready: boolean;
  supabase: { ready: boolean };
  openai: boolean;
  supabaseReachable?: boolean;
  openaiReachable?: boolean;
  checks: Array<{ key: string; label: string; set: boolean; required: boolean }>;
};

export function SetupConnectionClient() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/status", { cache: "no-store" });
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allGood =
    status?.ready &&
    status.supabaseReachable &&
    status.openai &&
    status.openaiReachable;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Connect your environment</CardTitle>
          <CardDescription>
            Add the values below to <code className="text-xs">.env.local</code> in your
            project folder, save the file, then restart{" "}
            <code className="text-xs">npm run dev</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && !status ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection…
            </div>
          ) : null}

          {status ? (
            <ul className="space-y-3">
              {status.checks.map((check) => {
                const live =
                  check.key === "NEXT_PUBLIC_SUPABASE_URL" ||
                  check.key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
                  check.key === "SUPABASE_SERVICE_ROLE_KEY"
                    ? status.supabaseReachable && check.set
                    : check.key === "OPENAI_API_KEY"
                      ? status.openaiReachable && check.set
                      : check.set;

                return (
                  <li
                    key={check.key}
                    className="flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm"
                  >
                    {check.set ? (
                      live ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      )
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{check.label}</p>
                      <p className="font-mono text-xs text-muted-foreground">{check.key}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Where to edit</p>
            <p className="mt-1">
              File: <code className="text-xs">Silman/.env.local</code>
            </p>
            <p className="mt-1">
              Copy from <code className="text-xs">.env.local.example</code> if the file
              is missing.
            </p>
            <p className="mt-1">
              Supabase keys: Dashboard → Project Settings → API.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
              )}
              Re-check
            </Button>
            {allGood ? (
              <Button asChild>
                <Link href="/login">Continue to Silman</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href="/">Back</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
