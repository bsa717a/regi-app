import type { DecodedIdToken } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export type VerifySuccess = {
  ok: true;
  decoded: DecodedIdToken;
  token: string;
};

export type VerifyFailure = {
  ok: false;
  response: NextResponse;
};

export type VerifyResult = VerifySuccess | VerifyFailure;

function unauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Verify the Firebase ID token from `Authorization: Bearer <token>`.
 * Never trust a client-provided uid — always use the decoded token.
 */
export async function verifyRequest(
  request: Request,
): Promise<VerifyResult> {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: unauthorized("Missing bearer token") };
  }

  const token = header.slice(7).trim();
  if (!token) {
    return { ok: false, response: unauthorized("Missing bearer token") };
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    return { ok: true, decoded, token };
  } catch {
    return { ok: false, response: unauthorized("Invalid or expired token") };
  }
}
