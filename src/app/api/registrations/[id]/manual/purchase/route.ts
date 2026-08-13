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
  isRetryablePaidLookupError,
  lookupPaidOwnerManual,
  paidManualLookupPreflightError,
} from "@/lib/manuals/lookupPaid";
import { chargeManualLookup } from "@/lib/manuals/payment";
import { saveOwnerManualOnRegistration } from "@/lib/manuals/saveManual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 10;

type RouteContext = { params: Promise<{ id: string }> };

async function fulfillPaidLookup(input: {
  registration: Registration;
  lookupRequestId: string;
}) {
  const paidResult = await lookupPaidOwnerManual(input.registration);

  if (paidResult.ok) {
    await prisma.$transaction([
      prisma.manualLookupRequest.update({
        where: { id: input.lookupRequestId },
        data: {
          status: "fulfilled",
          resultUrl: paidResult.url,
          provider: paidResult.provider,
        },
      }),
      prisma.registration.update({
        where: { id: input.registration.id },
        data: {
          ownerManualUrl: paidResult.url,
          ownerManualSource: "paid",
          ownerManualFoundAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      url: paidResult.url,
      charged: true,
    });
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

  if (registration.ownerManualUrl) {
    return NextResponse.json(
      {
        ok: true,
        url: registration.ownerManualUrl,
        charged: false,
        cached: true,
      },
      { headers: rateLimitHeaders(limited) },
    );
  }

  const existingRequest: ManualLookupRequest | null =
    await prisma.manualLookupRequest.findFirst({
      where: {
        registrationId: registration.id,
        status: { in: ["paid", "fulfilled", "failed"] },
      },
      orderBy: { createdAt: "desc" },
    });

  if (existingRequest?.resultUrl) {
    await saveOwnerManualOnRegistration({
      registrationId: registration.id,
      url: existingRequest.resultUrl,
      source: "paid",
    });

    return NextResponse.json(
      {
        ok: true,
        url: existingRequest.resultUrl,
        charged: true,
        cached: true,
      },
      { headers: rateLimitHeaders(limited) },
    );
  }

  if (existingRequest?.status === "failed") {
    return NextResponse.json(
      {
        ok: false,
        charged: false,
        error:
          "A previous paid lookup for this vehicle could not find a manual. No additional charge was made.",
      },
      { status: 200, headers: rateLimitHeaders(limited) },
    );
  }

  if (existingRequest) {
    const retryResponse = await fulfillPaidLookup({
      registration,
      lookupRequestId: existingRequest.id,
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
  });

  return new NextResponse(purchaseResponse.body, {
    status: purchaseResponse.status,
    headers: rateLimitHeaders(limited),
  });
}
