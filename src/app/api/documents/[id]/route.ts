import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadEditableDocument } from "@/lib/documents/ownership";
import { deleteObject } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:documents:id"),
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
 * DELETE /api/documents/[id]
 * Auth + household owner → delete GCS object and DB row (hard delete).
 */
export async function DELETE(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Document id is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const access = await loadEditableDocument(profile.id, id.trim());
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    await deleteObject(access.document.gcsPath);
  } catch {
    return NextResponse.json(
      { error: "Could not delete file from storage. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }

  await prisma.document.delete({
    where: { id: access.document.id },
  });

  return NextResponse.json(
    { ok: true },
    { headers: rateLimitHeaders(limited) },
  );
}
