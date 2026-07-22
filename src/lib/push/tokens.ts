import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PushTokenStore = Pick<
  PrismaClient,
  "pushToken"
>;

/** Upsert a device token for a user; refreshes lastSeenAt on re-register. */
export async function registerPushToken(
  userId: string,
  token: string,
  userAgent?: string | null,
  db: PushTokenStore = prisma,
): Promise<{ id: string; token: string; created: boolean }> {
  const existing = await db.pushToken.findUnique({
    where: { token },
    select: { id: true, userId: true },
  });

  if (existing) {
    // Do not reassign another user's token — possession of the string alone
    // must not steal push delivery. Same-user re-register refreshes metadata.
    if (existing.userId !== userId) {
      throw new Error("Push token is already registered to another account");
    }
    const updated = await db.pushToken.update({
      where: { token },
      data: {
        userAgent: userAgent ?? undefined,
        lastSeenAt: new Date(),
      },
      select: { id: true, token: true },
    });
    return { ...updated, created: false };
  }

  const created = await db.pushToken.create({
    data: {
      userId,
      token,
      userAgent: userAgent ?? null,
    },
    select: { id: true, token: true },
  });
  return { ...created, created: true };
}

/** Remove a token for a user (unregister / disable push on this device). */
export async function deletePushToken(
  userId: string,
  token: string,
  db: PushTokenStore = prisma,
): Promise<{ deleted: boolean }> {
  const existing = await db.pushToken.findUnique({
    where: { token },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return { deleted: false };
  }

  await db.pushToken.delete({ where: { token } });
  return { deleted: true };
}

/** List FCM tokens registered for a user. */
export async function listPushTokensForUser(
  userId: string,
  db: PushTokenStore = prisma,
): Promise<string[]> {
  const rows = await db.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  return rows.map((r) => r.token);
}

/**
 * Delete tokens that FCM reports as invalid / unregistered.
 * Safe to call with an empty list.
 */
export async function pruneInvalidPushTokens(
  tokens: string[],
  db: PushTokenStore = prisma,
): Promise<number> {
  if (tokens.length === 0) return 0;
  const result = await db.pushToken.deleteMany({
    where: { token: { in: tokens } },
  });
  return result.count;
}

/** FCM error codes that mean the token should be removed. */
export function isInvalidFcmTokenError(code: string | undefined): boolean {
  if (!code) return false;
  const normalized = code.toLowerCase();
  return (
    normalized.includes("registration-token-not-registered") ||
    normalized.includes("invalid-registration-token") ||
    normalized.includes("invalid-argument") ||
    normalized === "messaging/registration-token-not-registered" ||
    normalized === "messaging/invalid-registration-token" ||
    normalized === "messaging/invalid-argument"
  );
}
