import { buildSentryInitOptions, type SentryRuntimeEnv } from "@/lib/sentry/config";

type SentryLike = {
  getClient?: () => unknown;
  init: (options: Record<string, unknown>) => void;
};

export function initSentry(
  Sentry: SentryLike,
  env: SentryRuntimeEnv,
): { initialized: boolean } {
  const options = buildSentryInitOptions(env);
  if (!options) {
    return { initialized: false };
  }
  if (Sentry.getClient?.()) {
    return { initialized: true };
  }
  Sentry.init(options);
  return { initialized: true };
}
