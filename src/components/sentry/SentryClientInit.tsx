"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry/init";

/**
 * Runtime client init from server-passed env (Cloud Run secrets).
 * Complements instrumentation-client.ts (build-time NEXT_PUBLIC_*).
 * No-op when DSN is blank or the environment is local.
 */
export function SentryClientInit({
  dsn,
  environment,
}: {
  dsn?: string;
  environment?: string;
}) {
  useEffect(() => {
    initSentry(Sentry, {
      dsn,
      environment,
      nodeEnv: process.env.NODE_ENV,
    });
  }, [dsn, environment]);

  return null;
}
