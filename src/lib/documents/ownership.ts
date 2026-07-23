import type { Document, Registration, Renewal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireOwner,
  userCanAccessHousehold,
} from "@/lib/registrations/household";

export type AuthorizedRegistration =
  | { ok: true; registration: Registration }
  | { ok: false; status: 404 | 403; error: string };

/**
 * Load a registration and ensure the user can access its household.
 * Returns 404 (not 403) when inaccessible to avoid leaking existence.
 */
export async function loadAccessibleRegistration(
  userId: string,
  registrationId: string,
): Promise<AuthorizedRegistration> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!registration) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const allowed = await userCanAccessHousehold(userId, registration.householdId);
  if (!allowed) {
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: true, registration };
}

/**
 * Same as loadAccessibleRegistration, plus owner-only edit permission for uploads/deletes.
 */
export async function loadEditableRegistration(
  userId: string,
  registrationId: string,
): Promise<AuthorizedRegistration> {
  const access = await loadAccessibleRegistration(userId, registrationId);
  if (!access.ok) return access;

  const owner = await requireOwner(
    userId,
    access.registration.householdId,
    "change documents for this registration",
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
  | { ok: true; document: Document; registration: Registration }
  | { ok: false; status: 404 | 403; error: string };

export async function loadAccessibleDocument(
  userId: string,
  documentId: string,
): Promise<AuthorizedDocument> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { registration: true },
  });

  if (!document) {
    return { ok: false, status: 404, error: "Not found" };
  }

  const allowed = await userCanAccessHousehold(
    userId,
    document.registration.householdId,
  );
  if (!allowed) {
    return { ok: false, status: 404, error: "Not found" };
  }

  return { ok: true, document, registration: document.registration };
}

export async function loadEditableDocument(
  userId: string,
  documentId: string,
): Promise<AuthorizedDocument> {
  const access = await loadAccessibleDocument(userId, documentId);
  if (!access.ok) return access;

  const owner = await requireOwner(
    userId,
    access.registration.householdId,
    "delete documents for this registration",
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
 * Ensure a renewal belongs to the same registration (and thus household) before linking.
 */
export async function assertRenewalBelongsToRegistration(
  renewalId: string,
  registrationId: string,
): Promise<
  { ok: true; renewal: Renewal } | { ok: false; status: 400; error: string }
> {
  const renewal = await prisma.renewal.findUnique({
    where: { id: renewalId },
  });

  if (!renewal || renewal.registrationId !== registrationId) {
    return {
      ok: false,
      status: 400,
      error: "renewalId does not belong to this registration",
    };
  }

  return { ok: true, renewal };
}

/**
 * Confirm the signed gcsPath was issued for this household/registration.
 */
export function gcsPathMatchesRegistration(
  gcsPath: string,
  householdId: string,
  registrationId: string,
): boolean {
  const prefix = `households/${householdId}/registrations/${registrationId}/`;
  return gcsPath.startsWith(prefix) && !gcsPath.includes("..");
}
