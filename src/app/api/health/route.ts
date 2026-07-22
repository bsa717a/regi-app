import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness probe for Cloud Run / local checks. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "regi",
    timestamp: new Date().toISOString(),
  });
}
