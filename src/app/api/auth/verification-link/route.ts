import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { rewriteFirebaseEmailActionLink } from "@/lib/auth/emailAction";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { resolveAppOrigin } from "@/lib/household/appOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 8;

export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:verification-link"),
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
    return NextResponse.json({
      url: `${resolveAppOrigin(request)}/garage`,
      alreadyVerified: true,
    });
  }

  try {
    const firebaseLink =
      await getFirebaseAdminAuth().generateEmailVerificationLink(email);
    return NextResponse.json({
      url: rewriteFirebaseEmailActionLink(
        firebaseLink,
        resolveAppOrigin(request),
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not create a verification link. Please try again." },
      { status: 502 },
    );
  }
}
