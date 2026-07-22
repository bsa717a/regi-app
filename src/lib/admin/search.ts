import type { Prisma } from "@prisma/client";

export type AdminSearchQuery = {
  q: string;
  /** Max rows per entity type (users / vehicles). */
  limit?: number;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

/**
 * Build Prisma where clauses for admin user + vehicle search.
 * Matches email, name, plate, VIN, nickname (case-insensitive contains).
 */
export function buildAdminSearchWhere(q: string): {
  userWhere: Prisma.UserWhereInput;
  vehicleWhere: Prisma.VehicleWhereInput;
} | null {
  const trimmed = q.trim();
  if (!trimmed) return null;

  const contains: Prisma.StringFilter = {
    contains: trimmed,
    mode: "insensitive",
  };

  return {
    userWhere: {
      OR: [{ email: contains }, { name: contains }],
    },
    vehicleWhere: {
      OR: [
        { plate: contains },
        { vin: contains },
        { nickname: contains },
        { make: contains },
        { model: contains },
      ],
    },
  };
}

export function clampSearchLimit(limit?: number): number {
  if (limit == null || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

export type AdminSearchUserHit = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  firebaseUid: string;
  createdAt: string;
};

export type AdminSearchVehicleHit = {
  id: string;
  vin: string | null;
  plate: string | null;
  state: string;
  year: number | null;
  make: string | null;
  model: string | null;
  nickname: string | null;
  registrationExpiresOn: string;
  householdId: string;
  owner: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

export type AdminSearchResult = {
  query: string;
  users: AdminSearchUserHit[];
  vehicles: AdminSearchVehicleHit[];
};
