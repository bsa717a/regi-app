import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NotificationService } from "@/lib/notifications/NotificationService";
import type {
  AcceptHouseholdResponse,
  HouseholdDto,
  HouseholdMemberDto,
  InviteHouseholdResponse,
} from "@/lib/household/types";
import { getPrimaryHouseholdId } from "@/lib/registrations/household";

export type InviteDeps = {
  db?: PrismaClient;
  notificationService: NotificationService;
  /** Absolute app origin used to build invite links, e.g. https://app.regi.app */
  appOrigin: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash for optional storage audits; raw token is what goes in the email link. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildInviteUrl(appOrigin: string, token: string): string {
  const base = appOrigin.replace(/\/$/, "");
  return `${base}/invite/accept?token=${encodeURIComponent(token)}`;
}

function toMemberDto(
  row: {
    id: string;
    userId: string | null;
    inviteEmail: string | null;
    role: HouseholdMemberDto["role"];
    inviteStatus: HouseholdMemberDto["inviteStatus"];
    user: { email: string; name: string | null } | null;
  },
  currentUserId: string,
): HouseholdMemberDto {
  return {
    id: row.id,
    userId: row.userId,
    email: row.user?.email ?? row.inviteEmail,
    name: row.user?.name ?? null,
    role: row.role,
    inviteStatus: row.inviteStatus,
    isCurrentUser: row.userId === currentUserId,
  };
}

async function loadHouseholdDto(
  db: PrismaClient,
  householdId: string,
  currentUserId: string,
): Promise<HouseholdDto | null> {
  const household = await db.household.findUnique({
    where: { id: householdId },
    include: {
      members: {
        include: {
          user: { select: { email: true, name: true } },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!household) return null;

  const me = household.members.find(
    (m) => m.userId === currentUserId && m.inviteStatus === "accepted",
  );
  if (!me) return null;

  return {
    id: household.id,
    name: household.name,
    ownerUserId: household.ownerUserId,
    myRole: me.role,
    members: household.members.map((m) => toMemberDto(m, currentUserId)),
  };
}

export async function listHouseholdsForUser(
  userId: string,
  deps: { db?: PrismaClient } = {},
): Promise<HouseholdDto[]> {
  const db = deps.db ?? prisma;
  const memberships = await db.householdMember.findMany({
    where: { userId, inviteStatus: "accepted" },
    select: { householdId: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  const households: HouseholdDto[] = [];
  for (const m of memberships) {
    const dto = await loadHouseholdDto(db, m.householdId, userId);
    if (dto) households.push(dto);
  }
  return households;
}

export type InviteResult =
  | { ok: true; data: InviteHouseholdResponse }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function inviteToHousehold(
  ownerUserId: string,
  ownerEmail: string,
  input: { email: string; householdId?: string | null },
  deps: InviteDeps,
): Promise<InviteResult> {
  const db = deps.db ?? prisma;
  const email = normalizeEmail(input.email);

  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  if (email === normalizeEmail(ownerEmail)) {
    return {
      ok: false,
      status: 400,
      error: "You can't invite yourself to your household.",
    };
  }

  const householdId =
    input.householdId?.trim() ||
    (await getPrimaryHouseholdId(ownerUserId, null));

  if (!householdId) {
    return { ok: false, status: 400, error: "No household found for user" };
  }

  const ownerMembership = await db.householdMember.findFirst({
    where: {
      householdId,
      userId: ownerUserId,
      role: "owner",
      inviteStatus: "accepted",
    },
    select: { id: true },
  });

  if (!ownerMembership) {
    return {
      ok: false,
      status: 403,
      error: "Only household owners can invite members.",
    };
  }

  const household = await db.household.findUnique({
    where: { id: householdId },
    select: { id: true, name: true },
  });
  if (!household) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (existingUser) {
    const existingMembership = await db.householdMember.findFirst({
      where: {
        householdId,
        OR: [{ userId: existingUser.id }, { inviteEmail: email }],
      },
    });

    if (
      existingMembership &&
      existingMembership.inviteStatus === "accepted"
    ) {
      return {
        ok: false,
        status: 400,
        error: "That person is already a member of this household.",
      };
    }

    const token = generateInviteToken();
    const inviteUrl = buildInviteUrl(deps.appOrigin, token);

    const member = existingMembership
      ? await db.householdMember.update({
          where: { id: existingMembership.id },
          data: {
            userId: existingUser.id,
            inviteEmail: email,
            inviteToken: token,
            role: "viewer",
            inviteStatus: "pending",
          },
          include: { user: { select: { email: true, name: true } } },
        })
      : await db.householdMember.create({
          data: {
            householdId,
            userId: existingUser.id,
            inviteEmail: email,
            inviteToken: token,
            role: "viewer",
            inviteStatus: "pending",
          },
          include: { user: { select: { email: true, name: true } } },
        });

    await deps.notificationService.send({
      userId: ownerUserId,
      channel: "email",
      to: email,
      templateKey: "household_invite",
      variables: {
        householdName: household.name,
        inviteUrl,
        inviterEmail: ownerEmail,
      },
    });

    return {
      ok: true,
      data: {
        member: toMemberDto(member, ownerUserId),
        inviteToken:
          process.env.NODE_ENV === "production" ? undefined : token,
        inviteUrl:
          process.env.NODE_ENV === "production" ? undefined : inviteUrl,
      },
    };
  }

  const existingInvite = await db.householdMember.findFirst({
    where: { householdId, inviteEmail: email },
  });

  if (existingInvite?.inviteStatus === "accepted" && existingInvite.userId) {
    return {
      ok: false,
      status: 400,
      error: "That person is already a member of this household.",
    };
  }

  const token = generateInviteToken();
  const inviteUrl = buildInviteUrl(deps.appOrigin, token);

  const member = existingInvite
    ? await db.householdMember.update({
        where: { id: existingInvite.id },
        data: {
          userId: null,
          inviteEmail: email,
          inviteToken: token,
          role: "viewer",
          inviteStatus: "pending",
        },
        include: { user: { select: { email: true, name: true } } },
      })
    : await db.householdMember.create({
        data: {
          householdId,
          userId: null,
          inviteEmail: email,
          inviteToken: token,
          role: "viewer",
          inviteStatus: "pending",
        },
        include: { user: { select: { email: true, name: true } } },
      });

  await deps.notificationService.send({
    userId: ownerUserId,
    channel: "email",
    to: email,
    templateKey: "household_invite",
    variables: {
      householdName: household.name,
      inviteUrl,
      inviterEmail: ownerEmail,
    },
  });

  return {
    ok: true,
    data: {
      member: toMemberDto(member, ownerUserId),
      inviteToken: process.env.NODE_ENV === "production" ? undefined : token,
      inviteUrl: process.env.NODE_ENV === "production" ? undefined : inviteUrl,
    },
  };
}

export type AcceptResult =
  | { ok: true; data: AcceptHouseholdResponse }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function acceptHouseholdInvite(
  userId: string,
  userEmail: string,
  token: string,
  deps: { db?: PrismaClient } = {},
): Promise<AcceptResult> {
  const db = deps.db ?? prisma;
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "Invite token is required." };
  }

  const membership = await db.householdMember.findFirst({
    where: { inviteToken: trimmed },
  });

  if (!membership || membership.inviteStatus === "declined") {
    return {
      ok: false,
      status: 404,
      error: "This invite is invalid or has expired.",
    };
  }

  if (membership.inviteStatus === "accepted" && membership.userId === userId) {
    const household = await loadHouseholdDto(
      db,
      membership.householdId,
      userId,
    );
    if (!household) {
      return { ok: false, status: 404, error: "Not found" };
    }
    return { ok: true, data: { household } };
  }

  const inviteEmail = membership.inviteEmail
    ? normalizeEmail(membership.inviteEmail)
    : null;
  const accepterEmail = normalizeEmail(userEmail);

  if (inviteEmail && inviteEmail !== accepterEmail) {
    return {
      ok: false,
      status: 403,
      error:
        "Sign in with the email address this invite was sent to, then try again.",
    };
  }

  if (
    membership.userId &&
    membership.userId !== userId &&
    membership.inviteStatus === "pending"
  ) {
    // Invite was pre-linked to a different account email match — refuse.
    return {
      ok: false,
      status: 403,
      error:
        "This invite belongs to a different account. Sign in with the invited email.",
    };
  }

  // Already a member of another role? Allow viewer accept into shared household.
  await db.householdMember.update({
    where: { id: membership.id },
    data: {
      userId,
      inviteEmail: inviteEmail ?? accepterEmail,
      inviteToken: null,
      role: "viewer",
      inviteStatus: "accepted",
    },
  });

  const household = await loadHouseholdDto(db, membership.householdId, userId);
  if (!household) {
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: true, data: { household } };
}

export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function removeHouseholdMember(
  actorUserId: string,
  memberRowId: string,
  deps: { db?: PrismaClient } = {},
): Promise<RemoveMemberResult> {
  const db = deps.db ?? prisma;

  const target = await db.householdMember.findUnique({
    where: { id: memberRowId },
  });

  if (!target) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const actor = await db.householdMember.findFirst({
    where: {
      householdId: target.householdId,
      userId: actorUserId,
      role: "owner",
      inviteStatus: "accepted",
    },
  });

  if (!actor) {
    return {
      ok: false,
      status: 403,
      error: "Only household owners can remove members.",
    };
  }

  if (target.role === "owner") {
    return {
      ok: false,
      status: 400,
      error: "The household owner cannot be removed.",
    };
  }

  if (target.userId === actorUserId) {
    return {
      ok: false,
      status: 400,
      error: "You cannot remove yourself as the household owner.",
    };
  }

  await db.householdMember.delete({ where: { id: target.id } });
  return { ok: true };
}
