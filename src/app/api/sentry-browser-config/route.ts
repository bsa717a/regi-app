import { NextResponse } from "next/server";
import {
  normalizeSentryDsn,
  readSentryRuntimeEnv,
  resolveSentryEnvironment,
  shouldInitSentry,
} from "@/lib/sentry/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Browser-safe Sentry env for Cloud Run secrets (no rebuild).
 * The DSN is designed to be public; local/test/unmonitored stay empty.
 */
export function GET() {
  const env = readSentryRuntimeEnv();
  const headers = { "Cache-Control": "no-store" };
  if (!shouldInitSentry(env)) {
    return NextResponse.json({ dsn: null, environment: null }, { headers });
  }
  return NextResponse.json(
    {
      dsn: normalizeSentryDsn(env.dsn) ?? null,
      environment: resolveSentryEnvironment(env) ?? null,
    },
    { headers },
  );
}
