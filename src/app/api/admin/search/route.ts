import { NextResponse } from "next/server";
import {
  buildAdminSearchWhere,
  clampSearchLimit,
  type AdminSearchResult,
} from "@/lib/admin/search";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/search?q=
 * Search users (email, name) and registrations (plate, VIN, nickname, make, model).
 */
export async function GET(request: Request) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = clampSearchLimit(
    Number(url.searchParams.get("limit") ?? undefined),
  );

  const where = buildAdminSearchWhere(q);
  if (!where) {
    return NextResponse.json({
      query: "",
      users: [],
      registrations: [],
    } satisfies AdminSearchResult);
  }

  const [users, registrations] = await Promise.all([
    prisma.user.findMany({
      where: where.userWhere,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        firebaseUid: true,
        createdAt: true,
      },
    }),
    prisma.registration.findMany({
      where: where.registrationWhere,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        vin: true,
        plate: true,
        state: true,
        year: true,
        make: true,
        model: true,
        nickname: true,
        registrationExpiresOn: true,
        householdId: true,
        household: {
          select: {
            owner: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    }),
  ]);

  const result: AdminSearchResult = {
    query: q.trim(),
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      firebaseUid: u.firebaseUid,
      createdAt: u.createdAt.toISOString(),
    })),
    registrations: registrations.map((r) => ({
      id: r.id,
      vin: r.vin,
      plate: r.plate,
      state: r.state,
      year: r.year,
      make: r.make,
      model: r.model,
      nickname: r.nickname,
      registrationExpiresOn: r.registrationExpiresOn.toISOString().slice(0, 10),
      householdId: r.householdId,
      owner: r.household.owner
        ? {
            id: r.household.owner.id,
            email: r.household.owner.email,
            name: r.household.owner.name,
          }
        : null,
    })),
  };

  return NextResponse.json(result);
}
