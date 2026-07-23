/**
 * Household access helpers used by vehicle/document/renewal routes.
 * Role enforcement lives in `@/lib/household/roles`.
 */

export {
  getAcceptedMemberships,
  getAccessibleHouseholdIds,
  getHouseholdRoleMap,
  getMembershipRole,
  requireMember,
  requireOwner,
  roleCanEdit,
  userCanAccessHousehold,
  userCanEditHousehold,
} from "@/lib/household/roles";

import { prisma } from "@/lib/prisma";

export async function getPrimaryHouseholdId(
  userId: string,
  fallback: string | null,
): Promise<string | null> {
  if (fallback) return fallback;

  const owner = await prisma.householdMember.findFirst({
    where: {
      userId,
      role: "owner",
      inviteStatus: "accepted",
    },
    select: { householdId: true },
  });

  return owner?.householdId ?? null;
}
