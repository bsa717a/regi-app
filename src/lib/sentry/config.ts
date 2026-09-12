/**
 * Pure Sentry init policy — no SDK import, safe to unit test.
 *
 * Init is a no-op unless:
 * 1. A DSN is present (never invent one; empty = disabled)
 * 2. NODE_ENV is not development/test (keeps local/CI quiet)
 * 3. Resolved environment is production or staging
 */

export const SENTRY_MONITORED_ENVIRONMENTS = ["production", "staging"] as const;

export type SentryMonitoredEnvironment =
  (typeof SENTRY_MONITORED_ENVIRONMENTS)[number];

export type SentryRuntimeEnv = {
  dsn?: string | null;
  environment?: string | null;
  nodeEnv?: string | null;
};

export type SentryInitOptions = {
  dsn: string;
  environment: SentryMonitoredEnvironment;
  enabled: true;
  /** Perf tracing is out of MVP — errors only. */
  tracesSampleRate: 0;
  sendDefaultPii: false;
};

function trimToUndefined(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeSentryDsn(
  dsn: string | null | undefined,
): string | undefined {
  return trimToUndefined(dsn);
}

export function resolveSentryEnvironment(
  env: SentryRuntimeEnv,
): string | undefined {
  return (
    trimToUndefined(env.environment) ??
    trimToUndefined(env.nodeEnv)
  );
}

export function isLocalNodeEnv(nodeEnv: string | null | undefined): boolean {
  const value = (nodeEnv ?? "").trim().toLowerCase();
  return value === "development" || value === "test";
}

export function isMonitoredSentryEnvironment(
  environment: string | null | undefined,
): environment is SentryMonitoredEnvironment {
  const value = (environment ?? "").trim().toLowerCase();
  return (
    value === "production" ||
    value === "staging"
  );
}

export function shouldInitSentry(env: SentryRuntimeEnv): boolean {
  if (!normalizeSentryDsn(env.dsn)) return false;
  if (isLocalNodeEnv(env.nodeEnv)) return false;
  return isMonitoredSentryEnvironment(resolveSentryEnvironment(env));
}

export function buildSentryInitOptions(
  env: SentryRuntimeEnv,
): SentryInitOptions | null {
  const dsn = normalizeSentryDsn(env.dsn);
  const environment = resolveSentryEnvironment(env);
  if (!dsn || isLocalNodeEnv(env.nodeEnv)) return null;
  if (!isMonitoredSentryEnvironment(environment)) return null;
  return {
    dsn,
    environment,
    enabled: true,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  };
}

/**
 * Read process env for Sentry. Keep `NEXT_PUBLIC_*` as literal property
 * access so Next can inline them into the client bundle.
 */
export function readSentryRuntimeEnv(): SentryRuntimeEnv {
  return {
    dsn:
      process.env.SENTRY_DSN ||
      process.env.NEXT_PUBLIC_SENTRY_DSN ||
      undefined,
    environment:
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      undefined,
    nodeEnv: process.env.NODE_ENV,
  };
}
