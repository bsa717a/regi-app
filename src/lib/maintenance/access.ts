import type { Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getMembershipRole,
  requireOwner,
  userCanAccessHousehold,
} from "@/lib/registrations/household";
import { roleCanEdit } from "@/lib/household/roles";

export type MaintenanceAccess =
  | {
      ok: true;
      registration: Registration;
      canEdit: boolean;
      householdRole: "owner" | "viewer";
    }
  | { ok: false; status: 404 | 403; error: string };

export async function loadMaintenanceAccess(
  userId: string,
  registrationId: string,
  opts?: { requireEdit?: boolean },
): Promise<MaintenanceAccess> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!registration) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const allowed = await userCanAccessHousehold(
    userId,
    registration.householdId,
  );
  if (!allowed) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const role =
    (await getMembershipRole(userId, registration.householdId)) ?? "viewer";
  const canEdit = roleCanEdit(role);

  if (opts?.requireEdit) {
    const owner = await requireOwner(
      userId,
      registration.householdId,
      "change maintenance for this registration",
    );
    if (!owner.ok) {
      return { ok: false, status: owner.status, error: owner.error };
    }
  }

  return {
    ok: true,
    registration,
    canEdit,
    householdRole: role,
  };
}

export function vehicleDisplayName(registration: {
  nickname: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  return (
    registration.nickname?.trim() ||
    [registration.year, registration.make, registration.model]
      .filter(Boolean)
      .join(" ") ||
    "your vehicle"
  );
}
