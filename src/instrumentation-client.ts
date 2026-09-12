import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry/init";

// Literal NEXT_PUBLIC_* access so Next inlines the values into the bundle.
initSentry(Sentry, {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  nodeEnv: process.env.NODE_ENV,
});

// Required by @sentry/nextjs for App Router navigations. No traces are sent
// while tracesSampleRate is 0 (perf tracing is out of MVP).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
