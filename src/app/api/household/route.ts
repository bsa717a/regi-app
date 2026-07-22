import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { listHouseholdsForUser } from "@/lib/household/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

/**
 * GET /api/household
 * Households the caller belongs to (accepted), with members + roles.
 */
export async function GET(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:household"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const households = await listHouseholdsForUser(profile.id);

  return NextResponse.json(
    { households },
    { headers: rateLimitHeaders(limited) },
  );
}
