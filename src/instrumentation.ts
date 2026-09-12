import * as Sentry from "@sentry/nextjs";
import { shouldInitSentry, readSentryRuntimeEnv } from "@/lib/sentry/config";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
) {
  if (!shouldInitSentry(readSentryRuntimeEnv())) return;
  return Sentry.captureRequestError(...args);
}
