import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { decodeVin } from "@/lib/vin/decode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 20;

export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:vin:decode"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many VIN lookups. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  // Ensure user/household exist for authenticated callers.
  await getOrCreateUser(auth.decoded);

  let body: { vin?: unknown };
  try {
    body = (await request.json()) as { vin?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  if (typeof body.vin !== "string") {
    return NextResponse.json(
      { error: "vin is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const result = await decodeVin(body.vin);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        soft: true,
        error: result.error,
        vin: result.vin ?? null,
      },
      { status: 200, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      vin: result.vin,
      year: result.vehicle.year,
      make: result.vehicle.make,
      model: result.vehicle.model,
      bodyClass: result.vehicle.bodyClass,
    },
    { headers: rateLimitHeaders(limited) },
  );
}
