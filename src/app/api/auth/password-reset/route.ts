import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/auth/sendPasswordResetEmail";
import { EmailDeliveryNotConfiguredError } from "@/lib/auth/transactionalEmail";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { resolveAppOrigin } from "@/lib/household/appOrigin";
import { createEmailProviderFromEnv } from "@/lib/notifications/SendGridEmailProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:password-reset"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const emailLimited = await rateLimit({
    key: `api:password-reset:email:${email}`,
    limit: 3,
    windowMs: 10 * 60_000,
  });
  if (!emailLimited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(emailLimited) },
    );
  }

  try {
    await sendPasswordResetEmail({
      email,
      appOrigin: resolveAppOrigin(request),
      emailProvider: createEmailProviderFromEnv(),
    });
  } catch (err) {
    // Delivery config is checked before looking up the user, so 503 does not
    // leak account existence. Other failures must still look like success.
    if (err instanceof EmailDeliveryNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
  }

  return NextResponse.json(
    { sent: true },
    { headers: rateLimitHeaders(limited) },
  );
}
