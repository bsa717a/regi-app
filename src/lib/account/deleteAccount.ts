import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { deletePrefix } from "@/lib/storage/gcs";
import { householdGcsPrefix } from "@/lib/storage/gcsPaths";

export type DeleteAccountDeps = {
  db?: PrismaClient;
  deleteHouseholdFiles?: (householdId: string) => Promise<void>;
  deleteFirebaseUser?: (uid: string) => Promise<void>;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

async function defaultDeleteFirebaseUser(uid: string): Promise<void> {
  try {
    await getFirebaseAdminAuth().deleteUser(uid);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "auth/user-not-found") return;
    throw err;
  }
}

async function defaultDeleteHouseholdFiles(householdId: string): Promise<void> {
  await deletePrefix(householdGcsPrefix(householdId));
}

async function reassignViewerAuthoredRows(
  tx: DbClient,
  userId: string,
): Promise<void> {
  const viewerMemberships = await tx.householdMember.findMany({
    where: { userId, role: "viewer" },
    select: {
      householdId: true,
      household: { select: { ownerUserId: true } },
    },
  });

  for (const membership of viewerMemberships) {
    const ownerId = membership.household.ownerUserId;
    if (!ownerId || ownerId === userId) continue;

    await tx.document.updateMany({
      where: {
        uploadedBy: userId,
        registration: { householdId: membership.householdId },
      },
      data: { uploadedBy: ownerId },
    });
    await tx.registration.updateMany({
      where: { createdBy: userId, householdId: membership.householdId },
      data: { createdBy: ownerId },
    });
    await tx.renewal.updateMany({
      where: {
        requestedBy: userId,
        registration: { householdId: membership.householdId },
      },
      data: { requestedBy: ownerId },
    });
  }
}

async function deleteOwnedHousehold(
  tx: DbClient,
  userId: string,
  householdId: string,
): Promise<void> {
  await tx.payment.deleteMany({
    where: {
      OR: [
        { userId },
        { renewal: { registration: { householdId } } },
      ],
    },
  });
  await tx.household.delete({ where: { id: householdId } });
}

/**
 * Remove the Firebase Auth user first so a failed DB wipe cannot leave a
 * working sign-in, then delete REGI data. GCS files go first so a retry can
 * finish Auth + Postgres.
 */
export async function deleteAccount(
  firebaseUid: string,
  deps: DeleteAccountDeps = {},
): Promise<{ ok: true }> {
  const db = deps.db ?? prisma;
  const deleteHouseholdFiles =
    deps.deleteHouseholdFiles ?? defaultDeleteHouseholdFiles;
  const deleteFirebaseUser =
    deps.deleteFirebaseUser ?? defaultDeleteFirebaseUser;

  const user = await db.user.findUnique({
    where: { firebaseUid },
    select: { id: true, email: true, firebaseUid: true },
  });

  if (user) {
    const owned = await db.household.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (owned) {
      await deleteHouseholdFiles(owned.id);
    }

    await deleteFirebaseUser(firebaseUid);

    await db.$transaction(
      async (tx) => {
        await reassignViewerAuthoredRows(tx, user.id);

        if (owned) {
          await deleteOwnedHousehold(tx, user.id, owned.id);
        } else {
          await tx.payment.deleteMany({ where: { userId: user.id } });
        }

        await tx.householdMember.deleteMany({
          where: { inviteEmail: user.email, userId: null },
        });
        await tx.waitlist.deleteMany({ where: { email: user.email } });
        await tx.auditLog.updateMany({
          where: { actor: user.id },
          data: { actor: "deleted-user" },
        });
        await tx.staffUser.deleteMany({
          where: { firebaseUid: user.firebaseUid },
        });
        await tx.user.delete({ where: { id: user.id } });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  } else {
    await deleteFirebaseUser(firebaseUid);
  }

  return { ok: true };
}
