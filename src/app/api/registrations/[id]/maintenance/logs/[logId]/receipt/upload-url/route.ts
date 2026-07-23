import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadMaintenanceAccess } from "@/lib/maintenance/access";
import {
  buildReceiptGcsPath,
  parseReceiptUploadUrlBody,
} from "@/lib/maintenance/receipt";
import { createUploadSignedUrl } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string; logId: string }> };

/** POST .../logs/[logId]/receipt/upload-url */
export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:maintenance:receipt:upload-url"),
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
  const { id, logId } = await context.params;
  const access = await loadMaintenanceAccess(profile.id, id, {
    requireEdit: true,
  });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const log = await prisma.maintenanceLog.findFirst({
    where: { id: logId, registrationId: access.registration.id },
    select: { id: true },
  });
  if (!log) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: rateLimitHeaders(limited) },
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

  const parsed = parseReceiptUploadUrlBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const gcsPath = buildReceiptGcsPath({
    householdId: access.registration.householdId,
    registrationId: access.registration.id,
    logId: log.id,
  });

  try {
    const signed = await createUploadSignedUrl({
      gcsPath,
      contentType: parsed.data.contentType,
    });

    return NextResponse.json(
      {
        uploadUrl: signed.uploadUrl,
        gcsPath: signed.gcsPath,
        requiredHeaders: signed.requiredHeaders,
        expiresAt: signed.expiresAt.toISOString(),
      },
      { headers: rateLimitHeaders(limited) },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not prepare upload. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }
}
