import type { DecodedIdToken } from "firebase-admin/auth";
import type { StaffRole, StaffUser } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequest, type VerifyFailure } from "@/lib/auth/verifyRequest";

export type StaffAuthSuccess = {
  ok: true;
  decoded: DecodedIdToken;
  token: string;
  staff: StaffUser;
};

export type StaffAuthFailure = VerifyFailure | {
  ok: false;
  response: NextResponse;
};

export type StaffAuthResult = StaffAuthSuccess | StaffAuthFailure;

function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export type FindStaffByFirebaseUid = (
  firebaseUid: string,
) => Promise<StaffUser | null>;

/**
 * Verify Firebase ID token AND confirm the uid is on the staff_users allowlist.
 * Non-staff authenticated users receive 403.
 */
export async function verifyStaff(
  request: Request,
  deps?: {
    findStaffByFirebaseUid?: FindStaffByFirebaseUid;
  },
): Promise<StaffAuthResult> {
  const auth = await verifyRequest(request);
  if (!auth.ok) return auth;

  const findStaff =
    deps?.findStaffByFirebaseUid ??
    ((firebaseUid: string) =>
      prisma.staffUser.findUnique({ where: { firebaseUid } }));

  const staff = await findStaff(auth.decoded.uid);
  if (!staff) {
    return {
      ok: false,
      response: forbidden("Not authorized — staff access required"),
    };
  }

  return {
    ok: true,
    decoded: auth.decoded,
    token: auth.token,
    staff,
  };
}

export type StaffSummary = {
  id: string;
  firebaseUid: string;
  name: string;
  role: StaffRole;
};
