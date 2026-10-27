import { NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { createPrismaCatalogCache } from "@/lib/registrations/vehicleCatalog/prismaCache";
import { parseCatalogQuery } from "@/lib/registrations/vehicleCatalog/query";
import { resolveVehicleCatalog } from "@/lib/registrations/vehicleCatalog/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

export async function POST(request: Request) {
  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const limited = await rateLimit({
    key: `vehicle-catalog:${auth.decoded.uid}`,
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const query = parseCatalogQuery(body);
  if (!query) {
    return NextResponse.json(
      { error: "year, make, and model are required" },
      { status: 400 },
    );
  }

  const result = await resolveVehicleCatalog(query, {
    cache: createPrismaCatalogCache(),
  });
  return NextResponse.json(result, { headers: rateLimitHeaders(limited) });
}
