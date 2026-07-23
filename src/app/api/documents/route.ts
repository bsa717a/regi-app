import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import {
  assertRenewalBelongsToRegistration,
  gcsPathMatchesRegistration,
  loadAccessibleRegistration,
  loadEditableRegistration,
} from "@/lib/documents/ownership";
import { serializeDocument } from "@/lib/documents/serialize";
import { parseCreateDocumentBody } from "@/lib/documents/validation";
import { objectExists } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

async function enforceRateLimit(request: Request, suffix: string) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, `api:documents:${suffix}`),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(result) },
    );
  }

  return result;
}

/**
 * GET /api/documents?registrationId=...
 * Auth + household access → list metadata (no signed/public URLs).
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, "list");
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const registrationId = new URL(request.url).searchParams
    .get("registrationId")
    ?.trim();

  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId query parameter is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const access = await loadAccessibleRegistration(profile.id, registrationId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const documents = await prisma.document.findMany({
    where: { registrationId },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    { documents: documents.map(serializeDocument) },
    { headers: rateLimitHeaders(limited) },
  );
}

/**
 * POST /api/documents
 * After the client PUTs to the signed upload URL, record the vault row.
 * Optional `renewalId` links the vault row to a concierge renewal.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "create");
  if (limited instanceof NextResponse) return limited;

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

  const parsed = parseCreateDocumentBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const access = await loadEditableRegistration(
    profile.id,
    parsed.data.registrationId,
  );
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  if (
    !gcsPathMatchesRegistration(
      parsed.data.gcsPath,
      access.registration.householdId,
      access.registration.id,
    )
  ) {
    return NextResponse.json(
      { error: "gcsPath does not match this registration" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  if (parsed.data.renewalId) {
    const renewalCheck = await assertRenewalBelongsToRegistration(
      parsed.data.renewalId,
      access.registration.id,
    );
    if (!renewalCheck.ok) {
      return NextResponse.json(
        { error: renewalCheck.error },
        { status: renewalCheck.status, headers: rateLimitHeaders(limited) },
      );
    }
  }

  try {
    const exists = await objectExists(parsed.data.gcsPath);
    if (!exists) {
      return NextResponse.json(
        {
          error:
            "Upload not found in storage. Finish the signed upload, then confirm.",
        },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not verify upload. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }

  const document = await prisma.document.create({
    data: {
      registrationId: access.registration.id,
      renewalId: parsed.data.renewalId ?? null,
      type: parsed.data.type,
      gcsPath: parsed.data.gcsPath,
      originalFilename: parsed.data.originalFilename,
      uploadedBy: profile.id,
    },
  });

  return NextResponse.json(
    { document: serializeDocument(document) },
    { status: 201, headers: rateLimitHeaders(limited) },
  );
}
