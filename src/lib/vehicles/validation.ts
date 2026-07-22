import { normalizeVin, isValidVinFormat } from "@/lib/vin/decode";

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

export type ParsedVehicleBody = {
  vin: string | null;
  plate: string | null;
  state: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nickname: string | null;
  photoUrl: string | null;
  bodyClass: string | null;
  registrationExpiresOn: Date;
};

export function parseCreateVehicleBody(
  body: Record<string, unknown>,
): { ok: true; data: ParsedVehicleBody } | { ok: false; error: string } {
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

  if (!vin && !plate) {
    return {
      ok: false,
      error: "Provide a VIN or a license plate",
    };
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

  return {
    ok: true,
    data: {
      vin,
      plate,
      state,
      make,
      model,
      year: year ?? null,
      nickname,
      photoUrl,
      bodyClass,
      registrationExpiresOn,
    },
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parsePatchVehicleBody(
  body: Record<string, unknown>,
):
  | { ok: true; data: Partial<ParsedVehicleBody> }
  | { ok: false; error: string } {
  const data: Partial<ParsedVehicleBody> = {};

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

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  return { ok: true, data };
}
