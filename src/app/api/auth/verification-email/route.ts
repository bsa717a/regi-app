import { NextResponse } from "next/server";
import {
  EmailDeliveryNotConfiguredError,
  sendVerificationEmail,
} from "@/lib/auth/sendVerificationEmail";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { resolveAppOrigin } from "@/lib/household/appOrigin";
import { createEmailProviderFromEnv } from "@/lib/notifications/SendGridEmailProvider";
import { captureRouteException } from "@/lib/sentry/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 8;

export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:verification-email"),
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

  const email = auth.decoded.email?.trim();
  if (!email) {
    return NextResponse.json(
      { error: "This account does not have an email address." },
      { status: 400 },
    );
  }

  if (auth.decoded.email_verified) {
    return NextResponse.json({ sent: true, alreadyVerified: true });
  }

  try {
    await sendVerificationEmail({
      email,
      appOrigin: resolveAppOrigin(request),
      emailProvider: createEmailProviderFromEnv(),
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    if (err instanceof EmailDeliveryNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    captureRouteException(err, "POST /api/auth/verification-email");
    console.error("[verification-email] Failed to send:", err);
    return NextResponse.json(
      { error: "Could not send a verification email. Please try again." },
      { status: 502 },
    );
  }
}
