import type { Document, Renewal, Vehicle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireOwner,
  userCanAccessHousehold,
} from "@/lib/vehicles/household";
import { mergeDocumentsForRenewal } from "./vaultDocs";

export type RenewalWithRelations = Renewal & {
  vehicle: Vehicle;
  documents: Document[];
};

export type AuthorizedRenewal =
  | { ok: true; renewal: RenewalWithRelations }
  | { ok: false; status: 404 | 403; error: string };

async function loadRenewal(renewalId: string): Promise<RenewalWithRelations | null> {
  const renewal = await prisma.renewal.findUnique({
    where: { id: renewalId },
    include: {
      vehicle: true,
      documents: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] },
    },
  });
  if (!renewal) return null;

  // Include vehicle vault docs (renewalId null) so prior vault uploads count
  // toward renewal completeness and appear in the concierge UI.
  const vaultDocs = await prisma.document.findMany({
    where: {
      vehicleId: renewal.vehicleId,
      renewalId: null,
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  if (vaultDocs.length === 0) return renewal;

  return {
    ...renewal,
    documents: mergeDocumentsForRenewal(
      renewal.id,
      renewal.documents,
      vaultDocs,
    ),
  };
}

/**
 * Load a renewal and ensure the user can access its vehicle household.
 * Returns 404 when inaccessible to avoid leaking existence.
 */
export async function loadAccessibleRenewal(
  userId: string,
  renewalId: string,
): Promise<AuthorizedRenewal> {
  const renewal = await loadRenewal(renewalId);
  if (!renewal) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const allowed = await userCanAccessHousehold(
    userId,
    renewal.vehicle.householdId,
  );
  if (!allowed) {
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: true, renewal };
}

/**
 * Owner-only access for creating/submitting renewals.
 */
export async function loadEditableRenewal(
  userId: string,
  renewalId: string,
): Promise<AuthorizedRenewal> {
  const access = await loadAccessibleRenewal(userId, renewalId);
  if (!access.ok) return access;

  const owner = await requireOwner(
    userId,
    access.renewal.vehicle.householdId,
    "change this renewal",
  );
  if (!owner.ok) {
    return {
      ok: false,
      status: owner.status,
      error: owner.error,
    };
  }

  return access;
}
