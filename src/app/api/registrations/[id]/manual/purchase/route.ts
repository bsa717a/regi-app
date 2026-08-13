import { NextResponse } from "next/server";
import type { ManualLookupRequest, Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { requireOwner } from "@/lib/registrations/household";
import { loadAuthorizedRegistrationForManual } from "@/lib/manuals/access";
import {
  MANUAL_PAID_LOOKUP_FEE_CENTS,
  MANUAL_PAID_PROVIDER,
} from "@/lib/manuals/constants";
import {
  fulfillOwnerManualPdf,
  resolveStoredOwnerManual,
} from "@/lib/manuals/fulfillOwnerManual";
import {
  isRetryablePaidLookupError,
  lookupPaidOwnerManual,
  paidManualLookupPreflightError,
} from "@/lib/manuals/lookupPaid";
import { chargeManualLookup } from "@/lib/manuals/payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 10;

type RouteContext = { params: Promise<{ id: string }> };

async function fulfillPaidLookup(input: {
  registration: Registration;
  lookupRequestId: string;
  uploadedBy: string;
}) {
  const paidResult = await lookupPaidOwnerManual(input.registration);

  if (paidResult.ok) {
    await prisma.manualLookupRequest.update({
      where: { id: input.lookupRequestId },
      data: {
        status: "fulfilled",
        resultUrl: paidResult.url,
        provider: paidResult.provider,
      },
    });

    const fulfilled = await fulfillOwnerManualPdf({
      registration: input.registration,
      pdfUrl: paidResult.url,
      source: "paid",
      uploadedBy: input.uploadedBy,
    });

    if (fulfilled.ok) {
      return NextResponse.json({
        ...fulfilled,
        charged: true,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        charged: true,
        pending: false,
        error: fulfilled.error,
      },
      { status: 200 },
    );
  }

  if (isRetryablePaidLookupError(paidResult.error)) {
    await prisma.manualLookupRequest.update({
      where: { id: input.lookupRequestId },
      data: { status: "paid" },
    });

    return NextResponse.json({
      ok: false,
      charged: true,
      pending: true,
      message:
        "Payment successful. We’re still fetching your manual and will add it to this vehicle when it’s ready.",
      feeCents: MANUAL_PAID_LOOKUP_FEE_CENTS,
    });
  }

  await prisma.manualLookupRequest.update({
    where: { id: input.lookupRequestId },
    data: { status: "failed" },
  });

  return NextResponse.json(
    {
      ok: false,
      charged: true,
      pending: false,
      error: paidResult.error,
    },
    { status: 200 },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations:manual:purchase"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many manual purchase attempts. Please try again shortly." },
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
    "purchase a manual lookup",
  );
  if (!ownerCheck.ok) {
    return NextResponse.json(
      { error: ownerCheck.error },
      { status: ownerCheck.status, headers: rateLimitHeaders(limited) },
    );
  }

  const stored = await resolveStoredOwnerManual({ registration });
  if (stored) {
    return NextResponse.json(
      {
        ...stored,
        charged: false,
      },
      { headers: rateLimitHeaders(limited) },
    );
  }

  const existingPaid: ManualLookupRequest | null =
    await prisma.manualLookupRequest.findFirst({
      where: {
        registrationId: registration.id,
        status: { in: ["paid", "fulfilled"] },
      },
      orderBy: { createdAt: "desc" },
    });

  if (existingPaid?.resultUrl) {
    const fulfilled = await fulfillOwnerManualPdf({
      registration,
      pdfUrl: existingPaid.resultUrl,
      source: "paid",
      uploadedBy: profile.id,
    });
    if (fulfilled.ok) {
      return NextResponse.json(
        {
          ...fulfilled,
          charged: true,
        },
        { headers: rateLimitHeaders(limited) },
      );
    }
  }

  if (existingPaid) {
    const retryResponse = await fulfillPaidLookup({
      registration,
      lookupRequestId: existingPaid.id,
      uploadedBy: profile.id,
    });
    return new NextResponse(retryResponse.body, {
      status: retryResponse.status,
      headers: rateLimitHeaders(limited),
    });
  }

  const preflightError = paidManualLookupPreflightError(registration);
  if (preflightError) {
    return NextResponse.json(
      { ok: false, charged: false, error: preflightError },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const charge = await chargeManualLookup();
  const lookupRequest = await prisma.manualLookupRequest.create({
    data: {
      registrationId: registration.id,
      requestedBy: profile.id,
      status: "paid",
      feeCents: charge.amountCents,
      provider: MANUAL_PAID_PROVIDER,
      stripePaymentIntentId: charge.stripePaymentIntentId,
    },
  });

  const purchaseResponse = await fulfillPaidLookup({
    registration,
    lookupRequestId: lookupRequest.id,
    uploadedBy: profile.id,
  });

  return new NextResponse(purchaseResponse.body, {
    status: purchaseResponse.status,
    headers: rateLimitHeaders(limited),
  });
}
