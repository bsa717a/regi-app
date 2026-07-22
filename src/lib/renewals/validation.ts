import type { CreateRenewalInput } from "./types";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function parseCreateRenewalBody(
  body: Record<string, unknown>,
): ParseResult<CreateRenewalInput> {
  const vehicleId =
    typeof body.vehicleId === "string" ? body.vehicleId.trim() : "";
  if (!vehicleId) {
    return { ok: false, error: "vehicleId is required" };
  }

  let county: string | null | undefined;
  if (body.county === undefined) {
    county = undefined;
  } else if (body.county === null || body.county === "") {
    county = null;
  } else if (typeof body.county === "string") {
    county = body.county.trim() || null;
  } else {
    return { ok: false, error: "county must be a string or null" };
  }

  return { ok: true, data: { vehicleId, county } };
}

export function isEmailVerified(decoded: {
  email_verified?: boolean;
}): boolean {
  return decoded.email_verified === true;
}
