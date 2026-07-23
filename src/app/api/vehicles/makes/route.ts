import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { fetchPassengerMakes } from "@/lib/vehicles/nhtsaCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

export async function GET(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:vehicles:makes"),
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

  try {
    const makes = await fetchPassengerMakes();
    return NextResponse.json(
      { makes },
      { headers: rateLimitHeaders(limited) },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load vehicle makes. Try again shortly." },
      { status: 502, headers: rateLimitHeaders(limited) },
    );
  }
}
