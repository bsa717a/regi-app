import type { RegistrationType } from "@prisma/client";

/**
 * Side-profile photos for garage cards, keyed by year, make, and model.
 *
 * Paid vehicle-image APIs are not wired in: IMAGIN.studio getImage and
 * Vehicle Databases media both require a customer key and do not allow us to
 * redistribute their files. FuelEconomy.gov only publishes ~150×80 thumbnails
 * and has no documented photo API. The files under /images/vehicles are
 * original renders owned by this app. Trailers, unknown make/model, and
 * generations we do not have a render for use a simple full-vehicle fallback.
 */
export type VehicleCatalogQuery = {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  registrationType?: RegistrationType | null;
};

type CatalogEntry = {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  src: string;
};

/** One owned side profile per body generation. Years are inclusive. */
const CATALOG: CatalogEntry[] = [
  {
    make: "ford",
    model: "f150",
    yearFrom: 2021,
    yearTo: 2023,
    src: "/images/vehicles/ford-f-150-2021.webp",
  },
  {
    make: "volkswagen",
    model: "touareg",
    yearFrom: 2011,
    yearTo: 2014,
    src: "/images/vehicles/volkswagen-touareg-2011.webp",
  },
  {
    make: "chevrolet",
    model: "tahoe",
    yearFrom: 2021,
    yearTo: 2024,
    src: "/images/vehicles/chevrolet-tahoe-2021.webp",
  },
  {
    make: "tesla",
    model: "model3",
    yearFrom: 2017,
    yearTo: 2023,
    src: "/images/vehicles/tesla-model-3-2017.webp",
  },
];

const TRAILER_SRC = "/images/vehicles/utility-trailer.webp";

const MAKE_ALIASES: Record<string, string> = {
  vw: "volkswagen",
  chevy: "chevrolet",
  chev: "chevrolet",
};

export function normalizeVehicleToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function modelMatches(value: string, catalogModel: string): boolean {
  return value === catalogModel || value.startsWith(catalogModel);
}

/** Public path for a full side-profile photo, or null when we should fall back. */
export function vehicleCatalogImage(query: VehicleCatalogQuery): string | null {
  if (query.registrationType === "trailer") return TRAILER_SRC;

  const makeToken = normalizeVehicleToken(query.make ?? "");
  const modelToken = normalizeVehicleToken(query.model ?? "");
  if (!makeToken || !modelToken) return null;

  const make = MAKE_ALIASES[makeToken] ?? makeToken;
  const matches = CATALOG.filter(
    (entry) => entry.make === make && modelMatches(modelToken, entry.model),
  );
  if (matches.length === 0) return null;

  const year = query.year;
  if (year == null) {
    return matches.length === 1 ? matches[0]!.src : null;
  }

  return (
    matches.find((entry) => year >= entry.yearFrom && year <= entry.yearTo)
      ?.src ?? null
  );
}
