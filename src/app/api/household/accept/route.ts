import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { acceptHouseholdInvite } from "@/lib/household/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

/**
 * POST /api/household/accept
 * Logged-in invitee accepts a pending invite via token.
 */
export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:household:accept"),
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const token = typeof body.token === "string" ? body.token : "";
  const result = await acceptHouseholdInvite(profile.id, profile.email, token);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(result.data, {
    headers: rateLimitHeaders(limited),
  });
}
