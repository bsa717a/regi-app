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
import { validateReceiptGcsPath } from "@/lib/maintenance/receipt";
import { serializeLog } from "@/lib/maintenance/serialize";
import { objectExists } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string; logId: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:maintenance:receipt:confirm"),
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

/** POST .../logs/[logId]/receipt — confirm receipt upload. */
export async function POST(request: Request, context: RouteContext) {
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
    include: { task: { select: { name: true } } },
  });
  if (!existing) {
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

  if (typeof body.gcsPath !== "string" || !body.gcsPath.trim()) {
    return NextResponse.json(
      { error: "gcsPath is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const gcsPath = body.gcsPath.trim();
  if (
    !validateReceiptGcsPath(gcsPath, {
      householdId: access.registration.householdId,
      registrationId: access.registration.id,
      logId: existing.id,
    })
  ) {
    return NextResponse.json(
      { error: "Invalid receipt path" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const exists = await objectExists(gcsPath);
  if (!exists) {
    return NextResponse.json(
      { error: "Upload not found. Try uploading again." },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const filename =
    typeof body.filename === "string" && body.filename.trim()
      ? body.filename.trim().slice(0, 200)
      : "receipt.jpg";

  const log = await prisma.maintenanceLog.update({
    where: { id: existing.id },
    data: {
      receiptGcsPath: gcsPath,
      receiptFilename: filename,
    },
    include: { task: { select: { name: true } } },
  });

  return NextResponse.json(
    { log: await serializeLog(log) },
    { headers: rateLimitHeaders(limited) },
  );
}
