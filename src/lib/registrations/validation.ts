import type { RegistrationType } from "@prisma/client";
import { normalizeVin, isValidVinFormat } from "@/lib/vin/decode";
import {
  getRegistrationTypeRules,
  isValidRegistrationType,
} from "@/lib/stateEngine/registrationTypes";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import type { RegistrationDetails } from "@/lib/registrations/types";
import { isValidMotorhomeClass } from "@/lib/registrations/motorhome";

export function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readRequiredState(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const state = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) return null;
  return state;
}

export function readYear(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value < 1900 || value > 2100) return undefined;
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const year = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return undefined;
    return year;
  }
  return undefined;
}

/** Parse YYYY-MM-DD (or ISO) into a UTC date-only Date. */
export function parseExpirationDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function normalizePlate(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDetails(value: unknown): RegistrationDetails | undefined {
  if (value === undefined) return undefined;
  if (value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const details: RegistrationDetails = {};

  if (raw.hin !== undefined) {
    const hin = readOptionalString(raw.hin);
    if (hin === undefined) return undefined;
    details.hin = hin;
  }
  if (raw.serial !== undefined) {
    const serial = readOptionalString(raw.serial);
    if (serial === undefined) return undefined;
    details.serial = serial;
  }
  if (raw.ohvClass !== undefined) {
    const ohvClass = readOptionalString(raw.ohvClass);
    if (ohvClass === undefined) return undefined;
    details.ohvClass = ohvClass;
  }
  if (raw.motorhomeClass !== undefined) {
    const motorhomeClass = readOptionalString(raw.motorhomeClass);
    if (motorhomeClass === undefined) return undefined;
    if (motorhomeClass !== null && !isValidMotorhomeClass(motorhomeClass)) {
      return undefined;
    }
    details.motorhomeClass = motorhomeClass;
  }
  if (raw.unladenWeightLbs !== undefined) {
    if (raw.unladenWeightLbs === null) {
      details.unladenWeightLbs = null;
    } else if (
      typeof raw.unladenWeightLbs === "number" &&
      Number.isFinite(raw.unladenWeightLbs) &&
      raw.unladenWeightLbs >= 0
    ) {
      details.unladenWeightLbs = Math.round(raw.unladenWeightLbs);
    } else {
      return undefined;
    }
  }
  if (raw.lengthFeet !== undefined) {
    if (raw.lengthFeet === null) {
      details.lengthFeet = null;
    } else if (
      typeof raw.lengthFeet === "number" &&
      Number.isFinite(raw.lengthFeet) &&
      raw.lengthFeet > 0
    ) {
      details.lengthFeet = raw.lengthFeet;
    } else {
      return undefined;
    }
  }
  if (raw.horsepower !== undefined) {
    if (raw.horsepower === null) {
      details.horsepower = null;
    } else if (
      typeof raw.horsepower === "number" &&
      Number.isFinite(raw.horsepower) &&
      raw.horsepower >= 0
    ) {
      details.horsepower = Math.round(raw.horsepower);
    } else {
      return undefined;
    }
  }

  return details;
}

export type ParsedRegistrationBody = {
  type: RegistrationType;
  vin: string | null;
  plate: string | null;
  state: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nickname: string | null;
  photoUrl: string | null;
  bodyClass: string | null;
  details: RegistrationDetails;
  registrationExpiresOn: Date;
};

function validateIdentity(
  type: RegistrationType,
  config: StateRulesConfig,
  data: {
    vin: string | null;
    plate: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    details: RegistrationDetails;
  },
): string | null {
  const rules = getRegistrationTypeRules(config, type);
  if (!rules) {
    return `Registration type "${type}" is not supported in this state`;
  }

  const fields = new Set(rules.identityFields);
  const hasVin = Boolean(data.vin);
  const hasPlate = Boolean(data.plate);
  const hasHin = Boolean(data.details.hin);
  const hasSerial = Boolean(data.details.serial);
  const hasYmm = Boolean(data.year && data.make && data.model);

  if (fields.has("vin") && fields.has("plate")) {
    if (!hasVin && !hasPlate && !(fields.has("yearMakeModel") && hasYmm)) {
      return "Provide a VIN or a license plate";
    }
  } else if (fields.has("vin") && !hasVin) {
    return "VIN is required for this registration type";
  } else if (fields.has("plate") && !hasPlate && !fields.has("hin") && !fields.has("serial")) {
    return "Plate / registration number is required";
  }

  if (fields.has("hin") && !hasHin && !hasPlate && !hasSerial) {
    return "Provide a HIN, registration number, or serial";
  }

  if (fields.has("serial") && !hasSerial && !hasVin && !hasPlate && !hasHin) {
    return "Provide a serial number or another identity field";
  }

  if (fields.has("yearMakeModel") && !hasYmm && !hasVin && !hasPlate && !hasHin) {
    return "Provide year, make, and model (or another identity field)";
  }

  if (data.vin && rules.decode === "none") {
    // VIN allowed but not required / decoded for these types.
  }

  return null;
}

export function parseCreateRegistrationBody(
  body: Record<string, unknown>,
  config: StateRulesConfig,
): { ok: true; data: ParsedRegistrationBody } | { ok: false; error: string } {
  if (!isValidRegistrationType(body.type)) {
    return {
      ok: false,
      error:
        "type must be one of: passenger, motorhome, motorcycle, trailer, ohv, snowmobile, boat",
    };
  }
  const type = body.type;

  const state = readRequiredState(body.state);
  if (!state) {
    return { ok: false, error: "state must be a 2-letter state code" };
  }

  const registrationExpiresOn = parseExpirationDate(
    body.registrationExpiresOn,
  );
  if (!registrationExpiresOn) {
    return {
      ok: false,
      error: "registrationExpiresOn must be a valid YYYY-MM-DD date",
    };
  }

  const rawVin = readOptionalString(body.vin);
  const rawPlate = readOptionalString(body.plate);

  let vin: string | null = null;
  if (rawVin) {
    vin = normalizeVin(rawVin);
    if (!isValidVinFormat(vin)) {
      return {
        ok: false,
        error: "vin must be a valid 17-character VIN",
      };
    }
  }

  const plate = rawPlate ? normalizePlate(rawPlate) : null;
  const details = parseDetails(body.details) ?? {};
  if (body.details !== undefined && parseDetails(body.details) === undefined) {
    return { ok: false, error: "details contains invalid fields" };
  }

  const year = readYear(body.year);
  if (year === undefined) {
    return { ok: false, error: "year must be a valid 4-digit year" };
  }

  const make = readOptionalString(body.make) ?? null;
  const model = readOptionalString(body.model) ?? null;
  const nickname = readOptionalString(body.nickname) ?? null;
  const photoUrl = readOptionalString(body.photoUrl) ?? null;
  const bodyClass = readOptionalString(body.bodyClass) ?? null;

  if (photoUrl && !isHttpUrl(photoUrl)) {
    return { ok: false, error: "photoUrl must be an http(s) URL" };
  }

  const identityError = validateIdentity(type, config, {
    vin,
    plate,
    make,
    model,
    year: year ?? null,
    details,
  });
  if (identityError) {
    return { ok: false, error: identityError };
  }

  if (type === "motorhome") {
    const motorhomeClass = details.motorhomeClass;
    if (!motorhomeClass || !isValidMotorhomeClass(motorhomeClass)) {
      return {
        ok: false,
        error: "motorhomeClass must be one of: A, B, C",
      };
    }
  }

  return {
    ok: true,
    data: {
      type,
      vin,
      plate,
      state,
      make,
      model,
      year: year ?? null,
      nickname,
      photoUrl,
      bodyClass,
      details,
      registrationExpiresOn,
    },
  };
}

export function parsePatchRegistrationBody(
  body: Record<string, unknown>,
  type: RegistrationType,
  config: StateRulesConfig,
  existing: {
    vin: string | null;
    plate: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    details: RegistrationDetails;
  },
):
  | { ok: true; data: Partial<Omit<ParsedRegistrationBody, "type">> }
  | { ok: false; error: string } {
  if (body.type !== undefined) {
    return { ok: false, error: "Registration type cannot be changed" };
  }

  const data: Partial<Omit<ParsedRegistrationBody, "type">> = {};

  if (body.state !== undefined) {
    const state = readRequiredState(body.state);
    if (!state) {
      return { ok: false, error: "state must be a 2-letter state code" };
    }
    data.state = state;
  }

  if (body.registrationExpiresOn !== undefined) {
    const registrationExpiresOn = parseExpirationDate(
      body.registrationExpiresOn,
    );
    if (!registrationExpiresOn) {
      return {
        ok: false,
        error: "registrationExpiresOn must be a valid YYYY-MM-DD date",
      };
    }
    data.registrationExpiresOn = registrationExpiresOn;
  }

  if (body.vin !== undefined) {
    const rawVin = readOptionalString(body.vin);
    if (rawVin === undefined) {
      return { ok: false, error: "vin must be a string or null" };
    }
    if (rawVin === null) {
      data.vin = null;
    } else {
      const vin = normalizeVin(rawVin);
      if (!isValidVinFormat(vin)) {
        return { ok: false, error: "vin must be a valid 17-character VIN" };
      }
      data.vin = vin;
    }
  }

  if (body.plate !== undefined) {
    const rawPlate = readOptionalString(body.plate);
    if (rawPlate === undefined) {
      return { ok: false, error: "plate must be a string or null" };
    }
    data.plate = rawPlate ? normalizePlate(rawPlate) : null;
  }

  if (body.year !== undefined) {
    const year = readYear(body.year);
    if (year === undefined) {
      return { ok: false, error: "year must be a valid 4-digit year" };
    }
    data.year = year;
  }

  if (body.make !== undefined) {
    const make = readOptionalString(body.make);
    if (make === undefined) {
      return { ok: false, error: "make must be a string or null" };
    }
    data.make = make;
  }

  if (body.model !== undefined) {
    const model = readOptionalString(body.model);
    if (model === undefined) {
      return { ok: false, error: "model must be a string or null" };
    }
    data.model = model;
  }

  if (body.nickname !== undefined) {
    const nickname = readOptionalString(body.nickname);
    if (nickname === undefined) {
      return { ok: false, error: "nickname must be a string or null" };
    }
    data.nickname = nickname;
  }

  if (body.photoUrl !== undefined) {
    const photoUrl = readOptionalString(body.photoUrl);
    if (photoUrl === undefined) {
      return { ok: false, error: "photoUrl must be a string or null" };
    }
    if (photoUrl && !isHttpUrl(photoUrl)) {
      return { ok: false, error: "photoUrl must be an http(s) URL" };
    }
    data.photoUrl = photoUrl;
  }

  if (body.bodyClass !== undefined) {
    const bodyClass = readOptionalString(body.bodyClass);
    if (bodyClass === undefined) {
      return { ok: false, error: "bodyClass must be a string or null" };
    }
    data.bodyClass = bodyClass;
  }

  if (body.details !== undefined) {
    const details = parseDetails(body.details);
    if (details === undefined) {
      return { ok: false, error: "details contains invalid fields" };
    }
    data.details = { ...existing.details, ...details };
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  const identityError = validateIdentity(type, config, {
    vin: data.vin !== undefined ? data.vin : existing.vin,
    plate: data.plate !== undefined ? data.plate : existing.plate,
    make: data.make !== undefined ? data.make : existing.make,
    model: data.model !== undefined ? data.model : existing.model,
    year: data.year !== undefined ? data.year : existing.year,
    details: data.details !== undefined ? data.details : existing.details,
  });
  if (identityError) {
    return { ok: false, error: identityError };
  }

  if (type === "motorhome") {
    const mergedDetails =
      data.details !== undefined ? data.details : existing.details;
    const motorhomeClass = mergedDetails.motorhomeClass;
    if (!motorhomeClass || !isValidMotorhomeClass(motorhomeClass)) {
      return {
        ok: false,
        error: "motorhomeClass must be one of: A, B, C",
      };
    }
  }

  return { ok: true, data };
}
