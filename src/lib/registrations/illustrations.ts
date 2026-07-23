import type { RegistrationType } from "@prisma/client";

export type RegistrationIllustrationKind =
  | "suv"
  | "pickup"
  | "sedan"
  | "van"
  | "coupe"
  | "motorcycle"
  | "motorhome"
  | "trailer"
  | "ohv"
  | "snowmobile"
  | "boat"
  | "default";

export function illustrationKindFromType(
  type: RegistrationType,
  bodyClass?: string | null,
): RegistrationIllustrationKind {
  if (type === "motorhome") return "motorhome";
  if (type === "motorcycle") return "motorcycle";
  if (type === "trailer") return "trailer";
  if (type === "ohv") return "ohv";
  if (type === "snowmobile") return "snowmobile";
  if (type === "boat") return "boat";

  return illustrationKindFromBodyClass(bodyClass);
}

/** Catalog-style type art (same approach as Metabolic badge PNGs). */
export const REGISTRATION_TYPE_ART: Record<RegistrationType, string> = {
  passenger: "/images/registration-types/passenger.webp",
  motorhome: "/images/registration-types/motorhome.webp",
  motorcycle: "/images/registration-types/motorcycle.webp",
  trailer: "/images/registration-types/trailer.webp",
  ohv: "/images/registration-types/ohv.webp",
  snowmobile: "/images/registration-types/snowmobile.webp",
  boat: "/images/registration-types/boat.webp",
};

export function registrationTypeArtUrl(type: RegistrationType): string {
  // Plain public path only — Next.js Image rejects query strings unless
  // images.localPatterns allows them.
  return REGISTRATION_TYPE_ART[type];
}

export function illustrationKindFromBodyClass(
  bodyClass: string | null | undefined,
): RegistrationIllustrationKind {
  const value = (bodyClass ?? "").toLowerCase();

  if (!value) return "default";
  if (value.includes("motor")) return "motorcycle";
  if (value.includes("pickup") || value.includes("truck")) return "pickup";
  if (
    value.includes("sport utility") ||
    value.includes("mpv") ||
    value.includes("crossover") ||
    /\bsuv\b/.test(value)
  ) {
    return "suv";
  }
  if (value.includes("van") || value.includes("minivan")) return "van";
  if (value.includes("coupe") || value.includes("convertible")) return "coupe";
  if (
    value.includes("sedan") ||
    value.includes("saloon") ||
    value.includes("hatchback") ||
    value.includes("wagon")
  ) {
    return "sedan";
  }

  return "default";
}

export function titleCaseMakeModel(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split(/([\s-/]+)/)
    .map((part) => {
      if (/^[\s-/]+$/.test(part)) return part;
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

export const REGISTRATION_TYPE_LABELS: Record<RegistrationType, string> = {
  passenger: "Passenger vehicle",
  motorhome: "Motorhome",
  motorcycle: "Motorcycle",
  trailer: "Trailer",
  ohv: "OHV",
  snowmobile: "Snowmobile",
  boat: "Boat",
};

/** Plate / decal / HIN line for cards. */
export function identityLine(registration: {
  type: RegistrationType;
  plate: string | null;
  vin: string | null;
  details?: { hin?: string | null; serial?: string | null };
}): string {
  const plate = registration.plate?.trim();
  if (plate) {
    if (registration.type === "boat") return `Reg # ${plate}`;
    if (registration.type === "ohv" || registration.type === "snowmobile") {
      return `Decal ${plate}`;
    }
    return plate;
  }

  const hin = registration.details?.hin?.trim();
  if (hin) return `HIN ${hin}`;

  const serial = registration.details?.serial?.trim();
  if (serial) return `Serial ${serial}`;

  if (registration.vin) return `VIN …${registration.vin.slice(-6)}`;
  return "No ID on file";
}
