const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

export type VehicleCatalogMake = {
  id: number;
  name: string;
};

export type VehicleCatalogModel = {
  name: string;
};

type NhtsaMakeRow = {
  MakeId?: number;
  Make_ID?: number;
  MakeName?: string;
};

type NhtsaModelRow = {
  Model_Name?: string;
  ModelName?: string;
};

function readMakeId(row: NhtsaMakeRow): number | null {
  const id = row.MakeId ?? row.Make_ID;
  return typeof id === "number" && Number.isFinite(id) ? id : null;
}

function readMakeName(row: NhtsaMakeRow): string | null {
  const name = row.MakeName?.trim();
  return name ? name : null;
}

function readModelName(row: NhtsaModelRow): string | null {
  const name = (row.Model_Name ?? row.ModelName)?.trim();
  return name ? name : null;
}

async function fetchVpicJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86_400 },
  });

  if (!response.ok) {
    throw new Error(`VPIC request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

/** NHTSA vehicle types that cover US passenger/light-duty retail makes (car alone omits Rivian, etc.). */
const PASSENGER_VEHICLE_TYPES = [
  "car",
  "truck",
  "multipurpose passenger vehicle (mpv)",
] as const;

function mergeMakeRows(
  rows: NhtsaMakeRow[],
  into: Map<string, VehicleCatalogMake>,
): void {
  for (const row of rows) {
    const id = readMakeId(row);
    const name = readMakeName(row);
    if (id == null || !name) continue;
    const key = name.toLowerCase();
    if (!into.has(key)) {
      into.set(key, { id, name });
    }
  }
}

/** Passenger-vehicle makes sold in the US (NHTSA VPIC car + truck + MPV). */
export async function fetchPassengerMakes(): Promise<VehicleCatalogMake[]> {
  const byName = new Map<string, VehicleCatalogMake>();

  const batches = await Promise.all(
    PASSENGER_VEHICLE_TYPES.map(async (vehicleType) => {
      const encodedType = encodeURIComponent(vehicleType);
      const data = await fetchVpicJson<{ Results?: NhtsaMakeRow[] }>(
        `${VPIC_BASE}/GetMakesForVehicleType/${encodedType}?format=json`,
      );
      return data.Results ?? [];
    }),
  );

  for (const rows of batches) {
    mergeMakeRows(rows, byName);
  }

  return [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
}

/** Models for a make + model year (US VPIC catalog). */
export async function fetchModelsForMakeYear(
  make: string,
  year: number,
): Promise<VehicleCatalogModel[]> {
  const trimmedMake = make.trim();
  if (!trimmedMake) return [];

  const encodedMake = encodeURIComponent(trimmedMake);
  const data = await fetchVpicJson<{ Results?: NhtsaModelRow[] }>(
    `${VPIC_BASE}/GetModelsForMakeYear/make/${encodedMake}/modelyear/${year}?format=json`,
  );

  const names = new Set<string>();
  for (const row of data.Results ?? []) {
    const name = readModelName(row);
    if (name) names.add(name);
  }

  return [...names]
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
    .map((name) => ({ name }));
}

export function passengerModelYears(): number[] {
  const current = new Date().getFullYear();
  const max = current + 1;
  const min = 1981;
  const years: number[] = [];
  for (let y = max; y >= min; y -= 1) {
    years.push(y);
  }
  return years;
}
