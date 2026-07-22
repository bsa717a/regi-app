import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { readRequiredState } from "@/lib/vehicles/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 20;

export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:waitlist"),
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

  const profile = await getOrCreateUser(auth.decoded);

  let body: { email?: unknown; state?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; state?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const state = readRequiredState(body.state);
  if (!state) {
    return NextResponse.json(
      { error: "state must be a 2-letter state code" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const emailRaw =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : profile.email;

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const row = await prisma.waitlist.upsert({
    where: {
      email_state: { email: emailRaw, state },
    },
    create: { email: emailRaw, state },
    update: {},
  });

  return NextResponse.json(
    {
      ok: true,
      waitlist: {
        id: row.id,
        email: row.email,
        state: row.state,
        createdAt: row.createdAt.toISOString(),
      },
    },
    { status: 201, headers: rateLimitHeaders(limited) },
  );
}
