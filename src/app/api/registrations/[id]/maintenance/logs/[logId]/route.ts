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
import { deleteObject } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string; logId: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:maintenance:logs:id"),
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

/** DELETE /api/registrations/[id]/maintenance/logs/[logId] */
export async function DELETE(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

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

  const existing = await prisma.maintenanceLog.findFirst({
    where: { id: logId, registrationId: access.registration.id },
    select: { id: true, receiptGcsPath: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: rateLimitHeaders(limited) },
    );
  }

  if (existing.receiptGcsPath) {
    try {
      await deleteObject(existing.receiptGcsPath);
    } catch {
      // Continue with DB delete even if storage cleanup fails.
    }
  }

  await prisma.maintenanceLog.delete({ where: { id: existing.id } });

  return NextResponse.json(
    { ok: true },
    { headers: rateLimitHeaders(limited) },
  );
}
