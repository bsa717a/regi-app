import type { RegistrationType } from "@prisma/client";
import {
  illustrationKindFromBodyClass,
  illustrationKindFromType,
  type RegistrationIllustrationKind,
} from "@/lib/registrations/illustrations";

/**
 * Neutral body-type rasters. These are not a make or model.
 * Per-model photos come from the server catalog cache.
 */
export const GENERIC_VEHICLE_RASTER: Record<RegistrationIllustrationKind, string> = {
  sedan: "/images/vehicles/generic/sedan.webp",
  pickup: "/images/vehicles/generic/pickup.webp",
  suv: "/images/vehicles/generic/suv.webp",
  van: "/images/vehicles/generic/van.webp",
  coupe: "/images/vehicles/generic/coupe.webp",
  motorcycle: "/images/vehicles/generic/motorcycle.webp",
  motorhome: "/images/vehicles/generic/motorhome.webp",
  trailer: "/images/vehicles/generic/trailer.webp",
  ohv: "/images/vehicles/generic/ohv.webp",
  snowmobile: "/images/vehicles/generic/snowmobile.webp",
  boat: "/images/vehicles/generic/boat.webp",
  default: "/images/vehicles/generic/default.webp",
};

export function genericVehicleRaster(query: {
  bodyClass?: string | null;
  registrationType?: RegistrationType | null;
}): string {
  const kind = query.registrationType
    ? illustrationKindFromType(query.registrationType, query.bodyClass)
    : illustrationKindFromBodyClass(query.bodyClass);
  return GENERIC_VEHICLE_RASTER[kind];
}
