"use client";

import { RouteErrorFallback } from "@/components/sentry/RouteErrorFallback";

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Documents hit an unexpected error"
    />
  );
}
