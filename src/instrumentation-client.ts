import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry/init";

// Literal NEXT_PUBLIC_* access so Next inlines the values into the bundle.
initSentry(Sentry, {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  nodeEnv: process.env.NODE_ENV,
});
