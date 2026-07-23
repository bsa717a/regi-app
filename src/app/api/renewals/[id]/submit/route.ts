import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { createNotificationService } from "@/lib/notifications";
import {
  advanceRenewalStatus,
  buildRequiredDocumentStatus,
  isEmailVerified,
  loadEditableRenewal,
  parseFeeBreakdown,
  serializeRenewal,
} from "@/lib/renewals";
import { loadStateRules } from "@/lib/stateEngine/loadRules";
import { getRequiredDocumentsForType } from "@/lib/stateEngine/registrationTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/renewals/[id]/submit
 * Transition Requested → DocumentsReceived once all required docs are uploaded.
 * Requires verified email (Firebase token email_verified). No payment.
 */
export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:renewals:submit"),
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

  if (!isEmailVerified(auth.decoded)) {
    return NextResponse.json(
      {
        error:
          "Verify your email before submitting a renewal. Check your inbox for a confirmation link.",
      },
      { status: 403, headers: rateLimitHeaders(limited) },
    );
  }

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;

  const access = await loadEditableRenewal(profile.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  if (access.renewal.status !== "Requested") {
    return NextResponse.json(
      {
        error: `Renewal is already ${access.renewal.status} and cannot be submitted again.`,
      },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const config = await loadStateRules(access.renewal.registration.state);
  if (!config) {
    return NextResponse.json(
      { error: "State rules are not available for this registration" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const feeBreakdown = parseFeeBreakdown(access.renewal.feeBreakdown);
  const requiredDocuments = getRequiredDocumentsForType(
    config,
    access.renewal.registration.type,
  );
  // access.renewal.documents already merges vault docs (renewalId null).
  const completeness = buildRequiredDocumentStatus(
    { ...config, requiredDocuments },
    access.renewal.documents,
    feeBreakdown.county,
  );

  if (!completeness.complete) {
    const labels = completeness.required
      .filter((r) => !r.uploaded)
      .map((r) => r.label);
    return NextResponse.json(
      {
        error: `Missing required documents: ${labels.join(", ")}`,
        missingDocumentTypes: completeness.missingTypes,
      },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    // Attach any vault docs used for completeness so they stay on the renewal.
    const vaultIds = access.renewal.documents
      .filter((doc) => doc.renewalId == null)
      .map((doc) => doc.id);
    if (vaultIds.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: vaultIds }, renewalId: null },
        data: { renewalId: access.renewal.id },
      });
    }

    await advanceRenewalStatus(
      access.renewal.id,
      "DocumentsReceived",
      { kind: "user", userId: profile.id },
      {
        db: prisma,
        notificationService: createNotificationService(),
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not submit renewal. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }

  const refreshed = await loadEditableRenewal(profile.id, id);
  if (!refreshed.ok) {
    return NextResponse.json(
      { error: "Submitted, but could not reload renewal." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    { renewal: serializeRenewal(refreshed.renewal, config) },
    { headers: rateLimitHeaders(limited) },
  );
}
