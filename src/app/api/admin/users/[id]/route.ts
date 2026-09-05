import { NextResponse } from "next/server";
import { isDeleteConfirmation } from "@/lib/account/constants";
import { deleteAdminUser } from "@/lib/admin/deleteUser";
import {
  AdminUserError,
  parseAdminUserPatch,
  updateAdminUser,
} from "@/lib/admin/updateUser";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/users/[id]
 * Body: { name?, phone?, role?, addressLine1?, addressLine2?, city?, addressState?, postalCode? }
 * Updates profile fields, mailing address, and app role (Admin / User).
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseAdminUserPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const user = await updateAdminUser(
      {
        userId: id.trim(),
        actorFirebaseUid: auth.decoded.uid,
        patch: parsed.patch,
      },
      { db: prisma },
    );
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof AdminUserError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/users/patch]", err);
    return NextResponse.json(
      { error: "Could not update user" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Body: { confirm: "DELETE" }
 * Removes the Firebase user and owned household data.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isDeleteConfirmation(body)) {
    return NextResponse.json(
      { error: 'Confirm deletion by sending { "confirm": "DELETE" }' },
      { status: 400 },
    );
  }

  try {
    await deleteAdminUser(
      {
        userId: id.trim(),
        actorFirebaseUid: auth.decoded.uid,
      },
      { db: prisma },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminUserError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/users/delete]", err);
    return NextResponse.json(
      { error: "Could not delete user" },
      { status: 500 },
    );
  }
}
