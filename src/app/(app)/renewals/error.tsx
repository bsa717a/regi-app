"use client";

import { RouteErrorFallback } from "@/components/sentry/RouteErrorFallback";

export default function RenewalsError({
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
      title="Renewals hit an unexpected error"
    />
  );
}
