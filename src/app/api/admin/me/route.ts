import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth/verifyStaff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 * Confirms the caller is on the staff_users allowlist.
 */
export async function GET(request: Request) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    staff: {
      id: auth.staff.id,
      firebaseUid: auth.staff.firebaseUid,
      name: auth.staff.name,
      role: auth.staff.role,
    },
  });
}
