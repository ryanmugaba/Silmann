"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AppError({
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
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16">
      <ErrorState
        title="This page failed to load"
        description="Something went wrong. Please try again or contact your administrator."
        onRetry={reset}
      />
      <Button asChild variant="outline" className="rounded-xl">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
