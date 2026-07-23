import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { formatNotificationTitle } from "@/lib/notifications/formatTemplate";
import type { NotificationDto } from "@/lib/notifications/types";
import { titleCaseMakeModel } from "@/lib/registrations/illustrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parseLimit(url: URL): number {
  const raw = url.searchParams.get("limit");
  if (raw === null || raw === "") return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function registrationLabel(registration: {
  nickname: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
} | null): string | null {
  if (!registration) return null;
  if (registration.nickname?.trim()) return registration.nickname.trim();
  const headline = [
    registration.year,
    titleCaseMakeModel(registration.make),
    titleCaseMakeModel(registration.model),
  ]
    .filter(Boolean)
    .join(" ");
  return headline || null;
}

export async function GET(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:notifications"),
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
  const limit = parseLimit(new URL(request.url));

  const rows = await prisma.notification.findMany({
    where: { userId: profile.id },
    orderBy: [{ createdAt: "desc" }, { scheduledFor: "desc" }],
    take: limit,
    include: {
      registration: {
        select: {
          nickname: true,
          year: true,
          make: true,
          model: true,
        },
      },
    },
  });

  const notifications: NotificationDto[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    registrationId: row.registrationId,
    channel: row.channel,
    templateKey: row.templateKey,
    title: formatNotificationTitle(row.templateKey),
    registrationLabel: registrationLabel(row.registration),
    scheduledFor: row.scheduledFor.toISOString(),
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));

  return NextResponse.json(
    { notifications },
    { headers: rateLimitHeaders(limited) },
  );
}
