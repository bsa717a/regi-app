import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadAuthorizedRegistrationForManual } from "@/lib/manuals/access";
import { MANUAL_PAID_LOOKUP_FEE_CENTS } from "@/lib/manuals/constants";
import { lookupFreeOwnerManual } from "@/lib/manuals/lookupFree";
import { registrationSupportsPaidManualLookup } from "@/lib/manuals/lookupPaid";
import { saveOwnerManualOnRegistration } from "@/lib/manuals/saveManual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 15;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations:manual:lookup"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many manual lookups. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const loaded = await loadAuthorizedRegistrationForManual(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const registration = loaded.registration!;
  const paidAvailable = registrationSupportsPaidManualLookup(registration);

  if (registration.ownerManualUrl) {
    return NextResponse.json(
      {
        ok: true,
        url: registration.ownerManualUrl,
        source: registration.ownerManualSource ?? "free",
        cached: true,
      },
      { headers: rateLimitHeaders(limited) },
    );
  }

  const result = await lookupFreeOwnerManual({
    year: registration.year,
    make: registration.make,
    model: registration.model,
    vin: registration.vin,
    registrationType: registration.type,
  });

  if (result.ok) {
    await saveOwnerManualOnRegistration({
      registrationId: registration.id,
      url: result.url,
      source: "free",
    });

    return NextResponse.json(
      {
        ok: true,
        url: result.url,
        source: "free",
      },
      { headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      paidAvailable,
      ...(paidAvailable ? { feeCents: MANUAL_PAID_LOOKUP_FEE_CENTS } : {}),
    },
    { status: 200, headers: rateLimitHeaders(limited) },
  );
}
