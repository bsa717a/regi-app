import * as Sentry from "@sentry/nextjs";
import {
  isLocalNodeEnv,
  readSentryRuntimeEnv,
  shouldInitSentry,
  type SentryRuntimeEnv,
} from "@/lib/sentry/config";
import { initSentry } from "@/lib/sentry/init";

export type ExceptionContext = {
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
};

function hasSentryClient(): boolean {
  return Boolean(Sentry.getClient?.());
}

/**
 * Report when the SDK is already running (including a server-passed runtime
 * DSN) or when process env says we should. Safe no-op in local/test.
 */
function canCaptureNow(): boolean {
  if (hasSentryClient()) return true;
  return shouldInitSentry(readSentryRuntimeEnv());
}

function reportWithScope(error: unknown, context?: ExceptionContext): void {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.extras) {
      for (const [key, value] of Object.entries(context.extras)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}

async function recoverRuntimeClientAndReport(
  error: unknown,
  context?: ExceptionContext,
): Promise<void> {
  try {
    const response = await fetch("/api/sentry-browser-config", {
      credentials: "same-origin",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as SentryRuntimeEnv;
    const env: SentryRuntimeEnv = {
      dsn: payload.dsn,
      environment: payload.environment,
      nodeEnv: process.env.NODE_ENV,
    };
    if (!shouldInitSentry(env)) return;
    initSentry(Sentry, env);
    if (!hasSentryClient()) return;
    reportWithScope(error, context);
  } catch {
    // Reporting must never throw.
  }
}

/**
 * Report an exception when Sentry is actually initialized.
 * Safe no-op without a DSN, in development/test, or outside prod/staging.
 */
export function captureException(
  error: unknown,
  context?: ExceptionContext,
): void {
  if (canCaptureNow()) {
    reportWithScope(error, context);
    return;
  }
  if (typeof window === "undefined") return;
  if (isLocalNodeEnv(process.env.NODE_ENV)) return;
  void recoverRuntimeClientAndReport(error, context);
}

export function captureRouteException(error: unknown, route: string): void {
  captureException(error, { tags: { route } });
}
