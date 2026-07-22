import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { resolveAppOrigin } from "@/lib/household/appOrigin";
import { inviteToHousehold } from "@/lib/household/invite";
import { createNotificationService } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 20;

/**
 * POST /api/household/invite
 * Owner invites a spouse/partner by email as a viewer (pending until accepted).
 */
export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:household:invite"),
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

  const email = typeof body.email === "string" ? body.email : "";
  const householdId =
    typeof body.householdId === "string" ? body.householdId : undefined;

  const result = await inviteToHousehold(
    profile.id,
    profile.email,
    { email, householdId },
    {
      notificationService: createNotificationService(),
      appOrigin: resolveAppOrigin(request),
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(result.data, {
    status: 201,
    headers: rateLimitHeaders(limited),
  });
}
