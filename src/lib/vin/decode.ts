export type VinDecodeResult = {
  year: number | null;
  make: string | null;
  model: string | null;
  bodyClass: string | null;
};

export type VinDecodeSuccess = {
  ok: true;
  vin: string;
  vehicle: VinDecodeResult;
};

export type VinDecodeFailure = {
  ok: false;
  error: string;
  soft: true;
  vin?: string;
};

export type VinDecodeResponse = VinDecodeSuccess | VinDecodeFailure;

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function normalizeVin(vin: string): string {
  return vin.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidVinFormat(vin: string): boolean {
  return VIN_REGEX.test(normalizeVin(vin));
}

function cleanField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Not Applicable" || trimmed === "null") {
    return null;
  }
  return trimmed;
}

function parseYear(value: unknown): number | null {
  const raw = cleanField(value);
  if (!raw) return null;
  const year = Number.parseInt(raw, 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  return year;
}

/** Clean a raw NHTSA DecodeVinValues Results[0] row into our shape. */
export function cleanVinDecodeResult(
  row: Record<string, unknown> | null | undefined,
): VinDecodeResult {
  if (!row) {
    return { year: null, make: null, model: null, bodyClass: null };
  }

  return {
    year: parseYear(row.ModelYear),
    make: cleanField(row.Make),
    model: cleanField(row.Model),
    bodyClass: cleanField(row.BodyClass),
  };
}

export function hasUsableDecode(vehicle: VinDecodeResult): boolean {
  return Boolean(vehicle.year && vehicle.make && vehicle.model);
}

type FetchLike = typeof fetch;

export type DecodeVinOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

/**
 * Call NHTSA vPIC DecodeVinValues server-side.
 * Failures return a soft error so the UI can fall back to manual entry.
 */
export async function decodeVin(
  rawVin: string,
  options: DecodeVinOptions = {},
): Promise<VinDecodeResponse> {
  const vin = normalizeVin(rawVin);
  if (!isValidVinFormat(vin)) {
    return {
      ok: false,
      soft: true,
      error: "VIN must be 17 characters (letters and numbers, no I/O/Q).",
      vin,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        ok: false,
        soft: true,
        error: "VIN lookup is unavailable right now. Enter details manually.",
        vin,
      };
    }

    const data = (await response.json()) as {
      Results?: Array<Record<string, unknown>>;
    };
    const vehicle = cleanVinDecodeResult(data.Results?.[0]);

    if (!hasUsableDecode(vehicle)) {
      return {
        ok: false,
        soft: true,
        error: "We couldn't decode that VIN. Enter year, make, and model.",
        vin,
      };
    }

    return { ok: true, vin, vehicle };
  } catch {
    return {
      ok: false,
      soft: true,
      error: "VIN lookup timed out. Enter details manually.",
      vin,
    };
  } finally {
    clearTimeout(timer);
  }
}
