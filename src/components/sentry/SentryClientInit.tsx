"use client";

import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry/init";

/**
 * Runtime client init from server-passed env (Cloud Run secrets).
 * Complements instrumentation-client.ts (build-time NEXT_PUBLIC_*).
 * Runs during render so error boundaries can report on the first paint.
 * No-op when DSN is blank or the environment is local.
 */
export function SentryClientInit({
  dsn,
  environment,
}: {
  dsn?: string;
  environment?: string;
}) {
  if (typeof window !== "undefined") {
    initSentry(Sentry, {
      dsn,
      environment,
      nodeEnv: process.env.NODE_ENV,
    });
  }

  return null;
}
