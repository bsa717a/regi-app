import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { removeHouseholdMember } from "@/lib/household/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/household/members/[id]
 * Owner removes a member or revokes a pending invite. Owner cannot be removed.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:household:members:delete"),
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
  const { id } = await context.params;

  const result = await removeHouseholdMember(profile.id, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: rateLimitHeaders(limited) },
  );
}
