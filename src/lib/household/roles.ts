import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RoleCheckResult =
  | { ok: true; role: MemberRole }
  | { ok: false; status: 403 | 404; error: string };

export type AcceptedMembership = {
  householdId: string;
  role: MemberRole;
};

/**
 * Accepted memberships for a user (owned + shared households).
 * Owner households are listed first when roles are mixed.
 */
export async function getAcceptedMemberships(
  userId: string,
): Promise<AcceptedMembership[]> {
  const memberships = await prisma.householdMember.findMany({
    where: {
      userId,
      inviteStatus: "accepted",
    },
    select: { householdId: true, role: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return memberships;
}

export async function getAccessibleHouseholdIds(
  userId: string,
): Promise<string[]> {
  const memberships = await getAcceptedMemberships(userId);
  return memberships.map((m) => m.householdId);
}

export async function getHouseholdRoleMap(
  userId: string,
): Promise<Map<string, MemberRole>> {
  const memberships = await getAcceptedMemberships(userId);
  return new Map(memberships.map((m) => [m.householdId, m.role]));
}

export async function getMembershipRole(
  userId: string,
  householdId: string,
): Promise<MemberRole | null> {
  const membership = await prisma.householdMember.findFirst({
    where: {
      userId,
      householdId,
      inviteStatus: "accepted",
    },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function userCanAccessHousehold(
  userId: string,
  householdId: string,
): Promise<boolean> {
  const role = await getMembershipRole(userId, householdId);
  return role !== null;
}

/** Owner-only mutation gate for anonymous boolean checks. */
export async function userCanEditHousehold(
  userId: string,
  householdId: string,
): Promise<boolean> {
  const role = await getMembershipRole(userId, householdId);
  return role === "owner";
}

/**
 * Assert the user is an accepted owner of the household.
 * Returns 404 when they have no membership (avoid leaking existence),
 * 403 when they are a viewer (or other non-owner).
 */
export async function requireOwner(
  userId: string,
  householdId: string,
  action = "make changes in this household",
): Promise<RoleCheckResult> {
  const role = await getMembershipRole(userId, householdId);
  if (!role) {
    return { ok: false, status: 404, error: "Not found" };
  }
  if (role !== "owner") {
    return {
      ok: false,
      status: 403,
      error: `You do not have permission to ${action}`,
    };
  }
  return { ok: true, role };
}

/**
 * Assert the user is an accepted member (owner or viewer).
 */
export async function requireMember(
  userId: string,
  householdId: string,
): Promise<RoleCheckResult> {
  const role = await getMembershipRole(userId, householdId);
  if (!role) {
    return { ok: false, status: 404, error: "Not found" };
  }
  return { ok: true, role };
}

export function roleCanEdit(role: MemberRole | null | undefined): boolean {
  return role === "owner";
}
