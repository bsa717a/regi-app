"use client";

import { RouteErrorFallback } from "@/components/sentry/RouteErrorFallback";

export default function GarageError({
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
      title="Garage hit an unexpected error"
    />
  );
}
