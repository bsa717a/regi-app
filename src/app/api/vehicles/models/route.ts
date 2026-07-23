import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { fetchModelsForMakeYear } from "@/lib/vehicles/nhtsaCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 120;

export async function GET(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:vehicles:models"),
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

  await getOrCreateUser(auth.decoded);

  const url = new URL(request.url);
  const make = url.searchParams.get("make")?.trim() ?? "";
  const yearRaw = url.searchParams.get("year")?.trim() ?? "";

  if (!make) {
    return NextResponse.json(
      { error: "make is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const year = Number.parseInt(yearRaw, 10);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return NextResponse.json(
      { error: "year must be a valid 4-digit year" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    const models = await fetchModelsForMakeYear(make, year);
    return NextResponse.json(
      { models },
      { headers: rateLimitHeaders(limited) },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load models for that make and year." },
      { status: 502, headers: rateLimitHeaders(limited) },
    );
  }
}
