"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
            <AlertCircle className="h-7 w-7 text-danger" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-heading">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred. Your data is safe — try again or return
            to the dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button className="rounded-xl" onClick={() => reset()} type="button">
              Try again
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              type="button"
            >
              Go to dashboard
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
