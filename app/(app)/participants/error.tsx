"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function ParticipantsError({
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
    <ErrorState
      title="Could not load participants"
      description="Something went wrong. Please try again or contact your administrator."
      onRetry={reset}
      className="mx-auto max-w-md"
    />
  );
}
