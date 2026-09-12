"use client";

import { RouteErrorFallback } from "@/components/sentry/RouteErrorFallback";

export default function AppError({
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
      title="This page hit an unexpected error"
    />
  );
}
