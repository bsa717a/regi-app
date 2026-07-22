import type { DecodedIdToken } from "firebase-admin/auth";
import type { Prisma, PrismaClient, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/auth/notificationPrefs";

export type AuthUserProfile = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  phone: string | null;
  notificationPrefs: NotificationPrefs;
  createdAt: string;
  updatedAt: string;
  householdId: string | null;
};

export type GetOrCreateUserInput = {
  name?: string | null;
  phone?: string | null;
};

export type GetOrCreateUserDeps = {
  db?: PrismaClient;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

function householdNameFor(userName: string | null | undefined): string {
  const trimmed = userName?.trim();
  if (!trimmed) return "My Household";
  const base = trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
  return `${base} Household`;
}

async function ensureHouseholdOfOne(
  db: DbClient,
  user: User,
): Promise<string> {
  const existingMembership = await db.householdMember.findFirst({
    where: {
      userId: user.id,
      role: "owner",
      inviteStatus: "accepted",
    },
    select: { householdId: true },
  });

  if (existingMembership) {
    return existingMembership.householdId;
  }

  const owned = await db.household.findFirst({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  if (owned) {
    await db.householdMember.upsert({
      where: {
        householdId_userId: {
          householdId: owned.id,
          userId: user.id,
        },
      },
      create: {
        householdId: owned.id,
        userId: user.id,
        role: "owner",
        inviteStatus: "accepted",
      },
      update: {
        role: "owner",
        inviteStatus: "accepted",
      },
    });
    return owned.id;
  }

  try {
    const household = await db.household.create({
      data: {
        name: householdNameFor(user.name),
        ownerUserId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
            inviteStatus: "accepted",
          },
        },
      },
      select: { id: true },
    });
    return household.id;
  } catch (err) {
    // Concurrent first-login: unique(owner_user_id) raced — reuse the winner.
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      const raced = await db.household.findFirst({
        where: { ownerUserId: user.id },
        select: { id: true },
      });
      if (raced) return raced.id;
    }
    throw err;
  }
}

export function toAuthUserProfile(
  user: User,
  householdId: string | null,
): AuthUserProfile {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    phone: user.phone,
    notificationPrefs: parseNotificationPrefs(user.notificationPrefs),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    householdId,
  };
}

/**
 * Upsert the Postgres `users` row for a verified Firebase identity and ensure
 * a household-of-one (owner household + accepted owner membership).
 */
export async function getOrCreateUser(
  decoded: DecodedIdToken,
  input: GetOrCreateUserInput = {},
  deps: GetOrCreateUserDeps = {},
): Promise<AuthUserProfile> {
  const db = deps.db ?? prisma;
  const email = decoded.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("Authenticated user is missing an email address");
  }

  const name =
    typeof input.name === "string" && input.name.trim()
      ? input.name.trim()
      : (decoded.name?.trim() ?? null);
  const phone =
    typeof input.phone === "string" && input.phone.trim()
      ? input.phone.trim()
      : null;

  const user = await db.user.upsert({
    where: { firebaseUid: decoded.uid },
    create: {
      firebaseUid: decoded.uid,
      email,
      name,
      phone,
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    },
    update: {
      email,
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
    },
  });

  const householdId = await ensureHouseholdOfOne(db, user);
  return toAuthUserProfile(user, householdId);
}
