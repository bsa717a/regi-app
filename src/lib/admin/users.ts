import type { AppRole, Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export type AdminUserListItem = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  addressState: string | null;
  postalCode: string | null;
  role: AppRole;
  createdAt: string;
  registrationCount: number;
  renewalCount: number;
};

export type AdminUsersResponse = {
  query: string;
  total: number;
  viewerFirebaseUid: string;
  users: AdminUserListItem[];
};

export const adminUserListSelect = {
  id: true,
  firebaseUid: true,
  email: true,
  name: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  addressState: true,
  postalCode: true,
  role: true,
  createdAt: true,
  _count: {
    select: { requestedRenewals: true },
  },
  ownedHouseholds: {
    select: {
      _count: { select: { registrations: true } },
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserListRow = Prisma.UserGetPayload<{
  select: typeof adminUserListSelect;
}>;

export function buildAdminUserListWhere(q: string): Prisma.UserWhereInput {
  const trimmed = q.trim();
  if (!trimmed) return {};

  const contains: Prisma.StringFilter = {
    contains: trimmed,
    mode: "insensitive",
  };

  return {
    OR: [
      { email: contains },
      { name: contains },
      { city: contains },
      { addressLine1: contains },
    ],
  };
}

export function clampUserListLimit(limit?: number): number {
  if (limit == null || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

export function serializeAdminUserListItem(
  user: AdminUserListRow,
): AdminUserListItem {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    phone: user.phone,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    city: user.city,
    addressState: user.addressState,
    postalCode: user.postalCode,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    registrationCount: user.ownedHouseholds[0]?._count.registrations ?? 0,
    renewalCount: user._count.requestedRenewals,
  };
}
