import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { deletePushToken } from "@/lib/push/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type Body = {
  token?: unknown;
};

export async function DELETE(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:push:token"),
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.token !== "string" || body.token.trim().length < 10) {
    return NextResponse.json(
      { error: "token must be a non-empty FCM registration token" },
      { status: 400 },
    );
  }

  const profile = await getOrCreateUser(auth.decoded);
  const result = await deletePushToken(profile.id, body.token.trim());

  return NextResponse.json(
    { ok: true, deleted: result.deleted },
    { headers: rateLimitHeaders(limited) },
  );
}
