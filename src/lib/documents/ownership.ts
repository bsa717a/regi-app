import type { Document, Renewal, Vehicle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireOwner,
  userCanAccessHousehold,
} from "@/lib/vehicles/household";

export type AuthorizedVehicle =
  | { ok: true; vehicle: Vehicle }
  | { ok: false; status: 404 | 403; error: string };

/**
 * Load a vehicle and ensure the user can access its household.
 * Returns 404 (not 403) when inaccessible to avoid leaking existence.
 */
export async function loadAccessibleVehicle(
  userId: string,
  vehicleId: string,
): Promise<AuthorizedVehicle> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const allowed = await userCanAccessHousehold(userId, vehicle.householdId);
  if (!allowed) {
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: true, vehicle };
}

/**
 * Same as loadAccessibleVehicle, plus owner-only edit permission for uploads/deletes.
 */
export async function loadEditableVehicle(
  userId: string,
  vehicleId: string,
): Promise<AuthorizedVehicle> {
  const access = await loadAccessibleVehicle(userId, vehicleId);
  if (!access.ok) return access;

  const owner = await requireOwner(
    userId,
    access.vehicle.householdId,
    "change documents for this vehicle",
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

export type AuthorizedDocument =
  | { ok: true; document: Document; vehicle: Vehicle }
  | { ok: false; status: 404 | 403; error: string };

export async function loadAccessibleDocument(
  userId: string,
  documentId: string,
): Promise<AuthorizedDocument> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { vehicle: true },
  });

  if (!document) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const allowed = await userCanAccessHousehold(
    userId,
    document.vehicle.householdId,
  );
  if (!allowed) {
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: true, document, vehicle: document.vehicle };
}

export async function loadEditableDocument(
  userId: string,
  documentId: string,
): Promise<AuthorizedDocument> {
  const access = await loadAccessibleDocument(userId, documentId);
  if (!access.ok) return access;

  const owner = await requireOwner(
    userId,
    access.vehicle.householdId,
    "delete documents for this vehicle",
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

/**
 * Ensure a renewal belongs to the same vehicle (and thus household) before linking.
 */
export async function assertRenewalBelongsToVehicle(
  renewalId: string,
  vehicleId: string,
): Promise<
  { ok: true; renewal: Renewal } | { ok: false; status: 400; error: string }
> {
  const renewal = await prisma.renewal.findUnique({
    where: { id: renewalId },
  });

  if (!renewal || renewal.vehicleId !== vehicleId) {
    return {
      ok: false,
      status: 400,
      error: "renewalId does not belong to this vehicle",
    };
  }

  return { ok: true, renewal };
}

/**
 * Confirm the signed gcsPath was issued for this household/vehicle.
 */
export function gcsPathMatchesVehicle(
  gcsPath: string,
  householdId: string,
  vehicleId: string,
): boolean {
  const prefix = `households/${householdId}/vehicles/${vehicleId}/`;
  return gcsPath.startsWith(prefix) && !gcsPath.includes("..");
}
