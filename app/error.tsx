"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function RootError({
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
    <div className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred. Your data is safe."
        onRetry={reset}
      />
    </div>
  );
}
