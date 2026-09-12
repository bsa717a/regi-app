import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness probe for Cloud Run / local checks. */
export function healthPayload(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
) {
  return {
    ok: true as const,
    service: env.K_SERVICE?.trim() || "regi",
    environment:
      env.SENTRY_ENVIRONMENT?.trim() ||
      env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
      "unknown",
    firebaseProjectId:
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      env.FIREBASE_PROJECT_ID?.trim() ||
      "unknown",
    timestamp: now.toISOString(),
  };
}

export async function GET() {
  return NextResponse.json(healthPayload());
}
