import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry/init";

initSentry(Sentry, {
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  nodeEnv: process.env.NODE_ENV,
});
