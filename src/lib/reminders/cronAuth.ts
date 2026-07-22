import { NextResponse } from "next/server";

export type CronAuthSuccess = { ok: true };
export type CronAuthFailure = { ok: false; response: NextResponse };
export type CronAuthResult = CronAuthSuccess | CronAuthFailure;

/**
 * Secure Cloud Scheduler / cron callers with CRON_SECRET.
 * Accepts either:
 *   - Header `x-cron-secret: <CRON_SECRET>`
 *   - Header `Authorization: Bearer <CRON_SECRET>`
 */
export function verifyCronSecret(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): CronAuthResult {
  const expected = env.CRON_SECRET?.trim();
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 503 },
      ),
    };
  }

  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const auth = request.headers.get("authorization");
  const bearer =
    auth && auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : null;

  const provided = headerSecret || bearer;
  if (!provided || provided !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
