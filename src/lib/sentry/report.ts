import * as Sentry from "@sentry/nextjs";
import { shouldInitSentry, readSentryRuntimeEnv } from "@/lib/sentry/config";

export type ExceptionContext = {
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
};

/**
 * Report an exception when Sentry is actually initialized.
 * Safe no-op without a DSN, in development/test, or outside prod/staging.
 */
export function captureException(
  error: unknown,
  context?: ExceptionContext,
): void {
  if (!shouldInitSentry(readSentryRuntimeEnv())) return;

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

export function captureRouteException(error: unknown, route: string): void {
  captureException(error, { tags: { route } });
}
