import type { RegistrationType } from "@prisma/client";

function cleanField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Not Applicable" || trimmed === "null") {
    return null;
  }
  return trimmed;
}

const MOTORHOME_BODY_PATTERNS = [
  "motor home",
  "motorhome",
  " rv",
];

const MOTORHOME_MODEL_PATTERNS = ["motorhome", "motor home"];

const OHV_BODY_PATTERNS = [
  "atv",
  "all terrain",
  "off-road",
  "off road",
  "side-by-side",
  "side by side",
  "recreational off-highway",
  "recreational utility vehicle",
  " roh",
  " ohv",
];

const PASSENGER_BODY_PATTERNS = [
  "sedan",
  "coupe",
  "suv",
  "wagon",
  "hatchback",
  "pickup",
  "van",
  "convertible",
  "sport utility",
  "multi-purpose",
  "multipurpose",
];

/**
 * Map a raw NHTSA DecodeVinValues row to a Regi registration type when possible.
 * Returns null when the VIN decodes but the vehicle category is ambiguous
 * (e.g. some ATVs report as MOTORCYCLE with no body class).
 */
export function inferRegistrationTypeFromNhtsaRow(
  row: Record<string, unknown> | null | undefined,
): RegistrationType | null {
  if (!row) return null;

  const vehicleType = (cleanField(row.VehicleType) ?? "").toUpperCase();
  const bodyClass = (cleanField(row.BodyClass) ?? "").toLowerCase();
  const trailerType = cleanField(row.TrailerType);
  const model = (cleanField(row.Model) ?? "").toLowerCase();

  if (OHV_BODY_PATTERNS.some((pattern) => bodyClass.includes(pattern))) {
    return "ohv";
  }

  if (
    vehicleType === "TRAILER" ||
    bodyClass.includes("trailer") ||
    Boolean(trailerType)
  ) {
    return "trailer";
  }

  if (
    MOTORHOME_BODY_PATTERNS.some((pattern) => bodyClass.includes(pattern)) ||
    MOTORHOME_MODEL_PATTERNS.some((pattern) => model.includes(pattern)) ||
    (vehicleType === "INCOMPLETE VEHICLE" && model.includes("motorhome"))
  ) {
    return "motorhome";
  }

  if (
    vehicleType.includes("OFF ROAD") ||
    vehicleType.includes("OFF-ROAD") ||
    vehicleType === "OFF ROAD VEHICLE"
  ) {
    return "ohv";
  }

  if (vehicleType === "MOTORCYCLE" || bodyClass.includes("motorcycle")) {
    return "motorcycle";
  }

  if (
    vehicleType === "PASSENGER CAR" ||
    vehicleType === "TRUCK" ||
    vehicleType === "BUS" ||
    vehicleType.includes("MULTIPURPOSE PASSENGER") ||
    vehicleType.includes("LOW SPEED VEHICLE")
  ) {
    return "passenger";
  }

  if (PASSENGER_BODY_PATTERNS.some((pattern) => bodyClass.includes(pattern))) {
    return "passenger";
  }

  return null;
}
