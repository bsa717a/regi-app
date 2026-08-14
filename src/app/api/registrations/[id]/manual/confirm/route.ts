import { NextResponse } from "next/server";
import type { OwnerManualSource } from "@prisma/client";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { requireOwner } from "@/lib/registrations/household";
import { loadAuthorizedRegistrationForManual } from "@/lib/manuals/access";
import { ownerManualSuccessPayload, persistOwnerManualFromPdfUrl } from "@/lib/manuals/persistOwnerManual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 15;

type RouteContext = { params: Promise<{ id: string }> };

function parseSource(value: unknown): OwnerManualSource {
  return value === "paid" ? "paid" : "free";
}

export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations:manual:confirm"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many manual save attempts. Please try again shortly." },
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
  const ownerCheck = await requireOwner(
    profile.id,
    registration.householdId,
    "save an owner manual",
  );
  if (!ownerCheck.ok) {
    return NextResponse.json(
      { error: ownerCheck.error },
      { status: ownerCheck.status, headers: rateLimitHeaders(limited) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const pdfUrl = typeof body.pdfUrl === "string" ? body.pdfUrl.trim() : "";
  if (!pdfUrl) {
    return NextResponse.json(
      { error: "pdfUrl is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const persisted = await persistOwnerManualFromPdfUrl({
    registration,
    pdfUrl,
    source: parseSource(body.source),
    uploadedBy: profile.id,
  });

  if (!persisted.ok) {
    return NextResponse.json(
      { ok: false, error: persisted.error, code: persisted.code },
      { status: 200, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    ownerManualSuccessPayload({
      documentId: persisted.documentId,
      filename: persisted.filename,
      source: parseSource(body.source),
    }),
    { headers: rateLimitHeaders(limited) },
  );
}
