import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadAuthorizedRegistrationForManual } from "@/lib/manuals/access";
import { resolveStoredOwnerManual } from "@/lib/manuals/fulfillOwnerManual";
import { routeOwnerManualLookup } from "@/lib/manuals/lookupRouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 15;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(_request, "api:registrations:manual:lookup"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many manual lookups. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const auth = await verifyRequest(_request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const loaded = await loadAuthorizedRegistrationForManual(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const registration = loaded.registration!;
  const stored = await resolveStoredOwnerManual({ registration });

  const result = await routeOwnerManualLookup({
    registration,
    saved: stored,
  });

  return NextResponse.json(result, {
    status: 200,
    headers: rateLimitHeaders(limited),
  });
}
