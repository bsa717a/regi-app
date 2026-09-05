import { NextResponse } from "next/server";
import {
  adminUserListSelect,
  buildAdminUserListWhere,
  clampUserListLimit,
  serializeAdminUserListItem,
  type AdminUsersResponse,
} from "@/lib/admin/users";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users?q=&limit=
 * List consumer accounts, newest first. Optional email/name filter.
 */
export async function GET(request: Request) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = clampUserListLimit(
    Number(url.searchParams.get("limit") ?? undefined),
  );
  const where = buildAdminUserListWhere(q);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: adminUserListSelect,
    }),
  ]);

  const result: AdminUsersResponse = {
    query: q.trim(),
    total,
    viewerFirebaseUid: auth.decoded.uid,
    users: users.map(serializeAdminUserListItem),
  };

  return NextResponse.json(result);
}
