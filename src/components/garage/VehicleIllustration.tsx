import Image from "next/image";
import type { RegistrationType } from "@prisma/client";
import {
  FALLBACK_ILLUSTRATION_ART,
  illustrationKindFromBodyClass,
  registrationTypeArtUrl,
} from "@/lib/registrations/illustrations";
import { vehicleCatalogImage } from "@/lib/registrations/vehicleCatalogImage";

export function VehicleIllustration({
  bodyClass,
  photoUrl,
  label,
  registrationType,
  year,
  make,
  model,
}: {
  bodyClass?: string | null;
  photoUrl?: string | null;
  label: string;
  registrationType?: RegistrationType;
  year?: number | null;
  make?: string | null;
  model?: string | null;
}) {
  const catalogSrc = photoUrl
    ? null
    : vehicleCatalogImage({ year, make, model, registrationType });
  const faceSrc = photoUrl ?? catalogSrc;

  if (faceSrc) {
    return (
      // User uploads may be remote. Catalog files are owned static assets.
      // object-contain keeps the roof, wheels, and bumpers inside the card.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={faceSrc}
        alt={label}
        className="h-full w-full bg-[#e4e7ee] object-contain"
        data-testid="garage-vehicle-photo"
        loading="lazy"
      />
    );
  }

  const identityKnown = Boolean(make?.trim() && model?.trim());

  if (registrationType && !identityKnown) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#e4e7ee]">
        <Image
          src={registrationTypeArtUrl(registrationType)}
          alt={label}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 100vw, 480px"
          priority={false}
        />
      </div>
    );
  }

  const kind = illustrationKindFromBodyClass(bodyClass);
  const art = FALLBACK_ILLUSTRATION_ART[kind];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      aria-hidden
      data-testid="garage-vehicle-fallback"
    >
      {/* Raster side profile. 2400×1000 is ~3× the card. Both decode up front so dark mode is not blank. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={art.light}
        alt=""
        width={2400}
        height={1000}
        className="absolute inset-0 h-full w-full object-contain dark:hidden"
        data-testid="garage-vehicle-fallback-light"
        loading="eager"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={art.dark}
        alt=""
        width={2400}
        height={1000}
        className="absolute inset-0 hidden h-full w-full object-contain dark:block"
        data-testid="garage-vehicle-fallback-dark"
        loading="eager"
      />
    </div>
  );
}
