import type { PrismaClient } from "@prisma/client";
import { deleteAccount } from "@/lib/account/deleteAccount";
import { AdminUserError } from "./updateUser";

export async function deleteAdminUser(
  input: {
    userId: string;
    actorFirebaseUid: string;
  },
  deps: {
    db: PrismaClient;
    deleteAccount?: typeof deleteAccount;
  },
): Promise<void> {
  const user = await deps.db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, firebaseUid: true, role: true },
  });
  if (!user) {
    throw new AdminUserError("User not found", 404);
  }
  if (user.firebaseUid === input.actorFirebaseUid) {
    throw new AdminUserError("You cannot delete your own account here", 400);
  }
  if (user.role === "admin") {
    const remainingAdmins = await deps.db.user.count({
      where: { role: "admin", id: { not: user.id } },
    });
    if (remainingAdmins === 0) {
      throw new AdminUserError("At least one admin is required", 400);
    }
  }

  const removeAccount = deps.deleteAccount ?? deleteAccount;
  await removeAccount(user.firebaseUid, { db: deps.db });
}
