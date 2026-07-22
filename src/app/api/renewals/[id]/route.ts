import { NextResponse } from "next/server";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadAccessibleRenewal, serializeRenewal } from "@/lib/renewals";
import { loadStateRules } from "@/lib/stateEngine/loadRules";
import { getMembershipRole } from "@/lib/vehicles/household";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/renewals/[id]
 * Fetch renewal + required docs (from config) + uploads + status + fee breakdown.
 */
export async function GET(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:renewals:get"),
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

  const access = await loadAccessibleRenewal(profile.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const config = await loadStateRules(access.renewal.vehicle.state);
  if (!config) {
    return NextResponse.json(
      { error: "State rules are not available for this vehicle" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const role =
    (await getMembershipRole(
      profile.id,
      access.renewal.vehicle.householdId,
    )) ?? "viewer";

  return NextResponse.json(
    { renewal: serializeRenewal(access.renewal, config, role) },
    { headers: rateLimitHeaders(limited) },
  );
}
