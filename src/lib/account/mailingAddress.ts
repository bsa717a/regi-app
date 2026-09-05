import { isUsStateCode } from "@/lib/registrations/states";

const ZIP_RE = /^\d{5}(?:-\d{4})?$/;

export type MailingAddress = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  addressState: string | null;
  postalCode: string | null;
};

export type MailingAddressPatch = Partial<MailingAddress>;

export function emptyMailingAddress(): MailingAddress {
  return {
    addressLine1: null,
    addressLine2: null,
    city: null,
    addressState: null,
    postalCode: null,
  };
}

export function parseMailingAddressPatch(
  record: Record<string, unknown>,
): { ok: true; patch: MailingAddressPatch } | { ok: false; error: string } {
  const patch: MailingAddressPatch = {};

  if ("addressLine1" in record) {
    const value = readOptionalString(record.addressLine1);
    if (value === undefined) {
      return { ok: false, error: "Street address must be a string" };
    }
    patch.addressLine1 = value;
  }

  if ("addressLine2" in record) {
    const value = readOptionalString(record.addressLine2);
    if (value === undefined) {
      return { ok: false, error: "Address line 2 must be a string" };
    }
    patch.addressLine2 = value;
  }

  if ("city" in record) {
    const value = readOptionalString(record.city);
    if (value === undefined) {
      return { ok: false, error: "City must be a string" };
    }
    patch.city = value;
  }

  if ("addressState" in record) {
    const value = readOptionalString(record.addressState);
    if (value === undefined) {
      return { ok: false, error: "State must be a string" };
    }
    if (value !== null && !isUsStateCode(value)) {
      return { ok: false, error: "State must be a valid US state" };
    }
    patch.addressState = value ? value.toUpperCase() : null;
  }

  if ("postalCode" in record) {
    const value = readOptionalString(record.postalCode);
    if (value === undefined) {
      return { ok: false, error: "ZIP code must be a string" };
    }
    if (value !== null && !ZIP_RE.test(value)) {
      return { ok: false, error: "ZIP code must be 12345 or 12345-6789" };
    }
    patch.postalCode = value;
  }

  return { ok: true, patch };
}

export function formatMailingAddress(address: MailingAddress): string {
  const street = [address.addressLine1, address.addressLine2]
    .filter(Boolean)
    .join(", ");
  const cityState = [address.city, address.addressState]
    .filter(Boolean)
    .join(", ");
  const locality = [cityState, address.postalCode].filter(Boolean).join(" ");
  return [street, locality].filter(Boolean).join(", ");
}

export function formatMailingAddressShort(address: MailingAddress): string {
  const short = [address.city, address.addressState].filter(Boolean).join(", ");
  return short || "—";
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
