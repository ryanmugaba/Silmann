"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ParticipantDetailError({
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
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
        <AlertCircle className="h-7 w-7 text-danger" strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-xl font-semibold tracking-heading">
        Could not load participant
      </h2>
      <p className="text-sm text-muted-foreground">
        Something went wrong. Please try again or contact your administrator.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-xl">
          Try again
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/participants">Back to list</Link>
        </Button>
      </div>
    </div>
  );
}
