import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDeleteConfirmation } from "@/lib/account/constants";
import { deleteAccount } from "@/lib/account/deleteAccount";
import { getOrCreateUser, toAuthUserProfile } from "@/lib/auth/getOrCreateUser";
import {
  mergeNotificationPrefs,
  parseNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/auth/notificationPrefs";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:me"),
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

type MeBody = {
  name?: unknown;
  phone?: unknown;
  notificationPrefs?: unknown;
};

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPrefsPatch(value: unknown): Partial<NotificationPrefs> | null {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const patch: Partial<NotificationPrefs> = {};

  if (typeof record.push === "boolean") patch.push = record.push;
  if (typeof record.email === "boolean") patch.email = record.email;
  if (typeof record.sms === "boolean") patch.sms = record.sms;

  return patch;
}

async function handleUpsert(request: Request) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  let body: MeBody = {};
  if (request.method !== "GET") {
    try {
      body = (await request.json()) as MeBody;
    } catch {
      body = {};
    }
  }

  const profile = await getOrCreateUser(auth.decoded, {
    name: readOptionalString(body.name),
    phone: readOptionalString(body.phone),
  });

  return NextResponse.json(
    { user: profile },
    { headers: rateLimitHeaders(limited) },
  );
}

export async function GET(request: Request) {
  return handleUpsert(request);
}

export async function POST(request: Request) {
  return handleUpsert(request);
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  let body: MeBody;
  try {
    body = (await request.json()) as MeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = readOptionalString(body.name);
  const phone = readOptionalString(body.phone);
  const prefsPatch = readPrefsPatch(body.notificationPrefs);

  if (
    name === undefined &&
    phone === undefined &&
    prefsPatch === null &&
    body.notificationPrefs === undefined
  ) {
    return NextResponse.json(
      { error: "Provide name, phone, and/or notificationPrefs to update" },
      { status: 400 },
    );
  }

  if (body.notificationPrefs !== undefined && prefsPatch === null) {
    return NextResponse.json(
      { error: "notificationPrefs must be an object with boolean channels" },
      { status: 400 },
    );
  }

  // Ensure the user row + household exist before updating.
  const ensured = await getOrCreateUser(auth.decoded, { name, phone });

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: ensured.id },
  });

  const nextPrefs = prefsPatch
    ? mergeNotificationPrefs(
        parseNotificationPrefs(current.notificationPrefs),
        prefsPatch,
      )
    : undefined;

  const updated = await prisma.user.update({
    where: { id: current.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(nextPrefs ? { notificationPrefs: nextPrefs } : {}),
    },
  });

  return NextResponse.json(
    {
      user: toAuthUserProfile(updated, ensured.householdId),
    },
    { headers: rateLimitHeaders(limited) },
  );
}

/**
 * DELETE /api/me
 * Guideline 5.1.1(v): in-app account deletion. Body must be { confirm: "DELETE" }.
 */
export async function DELETE(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:me:delete"),
    limit: 5,
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isDeleteConfirmation(body)) {
    return NextResponse.json(
      { error: 'Confirm deletion by sending { "confirm": "DELETE" }' },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  await deleteAccount(auth.decoded.uid);

  return NextResponse.json(
    { ok: true },
    { headers: rateLimitHeaders(limited) },
  );
}
