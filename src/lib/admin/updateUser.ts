import type { AppRole, Prisma, PrismaClient, User } from "@prisma/client";
import {
  parseMailingAddressPatch,
  type MailingAddressPatch,
} from "@/lib/account/mailingAddress";
import {
  adminUserListSelect,
  serializeAdminUserListItem,
  type AdminUserListItem,
} from "./users";

export const APP_ROLES = ["user", "admin"] as const;

export type AppRoleName = (typeof APP_ROLES)[number];

export class AdminUserError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminUserError";
    this.status = status;
  }
}

export type AdminUserPatch = {
  name?: string | null;
  phone?: string | null;
  role?: AppRoleName;
} & MailingAddressPatch;

export function parseAdminUserPatch(
  body: unknown,
): { ok: true; patch: AdminUserPatch } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body is required" };
  }

  const record = body as Record<string, unknown>;
  const patch: AdminUserPatch = {};

  if ("name" in record) {
    const name = readOptionalString(record.name);
    if (name === undefined) {
      return { ok: false, error: "Name must be a string" };
    }
    patch.name = name;
  }

  if ("phone" in record) {
    const phone = readOptionalString(record.phone);
    if (phone === undefined) {
      return { ok: false, error: "Phone must be a string" };
    }
    patch.phone = phone;
  }

  if ("role" in record) {
    const role = record.role;
    if (typeof role !== "string" || !isAppRole(role)) {
      return { ok: false, error: "Role must be Admin or User" };
    }
    patch.role = role;
  }

  const address = parseMailingAddressPatch(record);
  if (!address.ok) return address;
  Object.assign(patch, address.patch);

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No fields to update" };
  }

  return { ok: true, patch };
}

export function isAppRole(value: string): value is AppRoleName {
  return (APP_ROLES as readonly string[]).includes(value);
}

export async function updateAdminUser(
  input: {
    userId: string;
    actorFirebaseUid: string;
    patch: AdminUserPatch;
  },
  deps: {
    db: PrismaClient | Prisma.TransactionClient;
  },
): Promise<AdminUserListItem> {
  const user = await deps.db.user.findUnique({
    where: { id: input.userId },
  });
  if (!user) {
    throw new AdminUserError("User not found", 404);
  }

  const nextRole = input.patch.role ?? user.role;
  if (user.role === "admin" && nextRole === "user") {
    if (user.firebaseUid === input.actorFirebaseUid) {
      throw new AdminUserError("You cannot remove your own admin role", 400);
    }
    const remainingAdmins = await deps.db.user.count({
      where: { role: "admin", id: { not: user.id } },
    });
    if (remainingAdmins === 0) {
      throw new AdminUserError("At least one admin is required", 400);
    }
  }

  const nextName =
    input.patch.name !== undefined ? input.patch.name : user.name;

  const updated = await deps.db.user.update({
    where: { id: user.id },
    data: {
      ...(input.patch.name !== undefined ? { name: input.patch.name } : {}),
      ...(input.patch.phone !== undefined ? { phone: input.patch.phone } : {}),
      ...(input.patch.addressLine1 !== undefined
        ? { addressLine1: input.patch.addressLine1 }
        : {}),
      ...(input.patch.addressLine2 !== undefined
        ? { addressLine2: input.patch.addressLine2 }
        : {}),
      ...(input.patch.city !== undefined ? { city: input.patch.city } : {}),
      ...(input.patch.addressState !== undefined
        ? { addressState: input.patch.addressState }
        : {}),
      ...(input.patch.postalCode !== undefined
        ? { postalCode: input.patch.postalCode }
        : {}),
      ...(input.patch.role !== undefined
        ? { role: input.patch.role as AppRole }
        : {}),
    },
    select: adminUserListSelect,
  });

  if (input.patch.role !== undefined) {
    await syncStaffAccess(deps.db, {
      firebaseUid: user.firebaseUid,
      name: nextName,
      email: user.email,
      role: nextRole,
    });
  } else if (input.patch.name !== undefined) {
    const staffName = nextName?.trim() || user.email;
    await deps.db.staffUser.updateMany({
      where: { firebaseUid: user.firebaseUid },
      data: { name: staffName },
    });
  }

  return serializeAdminUserListItem(updated);
}

async function syncStaffAccess(
  db: PrismaClient | Prisma.TransactionClient,
  user: Pick<User, "firebaseUid" | "name" | "email" | "role">,
) {
  const staffName = user.name?.trim() || user.email;

  if (user.role === "admin") {
    await db.staffUser.upsert({
      where: { firebaseUid: user.firebaseUid },
      create: {
        firebaseUid: user.firebaseUid,
        name: staffName,
        role: "admin",
      },
      update: {
        name: staffName,
        role: "admin",
      },
    });
    return;
  }

  await db.staffUser.deleteMany({
    where: { firebaseUid: user.firebaseUid },
  });
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
