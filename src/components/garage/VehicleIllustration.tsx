"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { RegistrationType } from "@prisma/client";
import { registrationTypeArtUrl } from "@/lib/registrations/illustrations";
import { genericVehicleRaster } from "@/lib/registrations/vehicleCatalogImage";
import {
  loadVehicleCatalogImage,
  type CatalogClientResult,
} from "@/lib/registrations/vehicleCatalog/client";

export function VehicleIllustration({
  bodyClass,
  photoUrl,
  label,
  registrationType,
  year,
  make,
  model,
  getIdToken,
  onCatalog,
}: {
  bodyClass?: string | null;
  photoUrl?: string | null;
  label: string;
  registrationType?: RegistrationType;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  /** When set, a missed catalog entry is resolved in the background. */
  getIdToken?: () => Promise<string | null>;
  onCatalog?: (result: CatalogClientResult | null) => void;
}) {
  const userPhoto = photoUrl?.trim() || null;
  const identityKnown = Boolean(make?.trim() && model?.trim() && year);
  const lookupEnabled = Boolean(getIdToken);
  const [catalog, setCatalog] = useState<CatalogClientResult | null>(null);
  const onCatalogRef = useRef(onCatalog);
  const getTokenRef = useRef(getIdToken);
  onCatalogRef.current = onCatalog;
  getTokenRef.current = getIdToken;

  useEffect(() => {
    const getToken = getTokenRef.current;
    if (userPhoto || !identityKnown || !getToken || year == null) {
      setCatalog(null);
      onCatalogRef.current?.(null);
      return;
    }
    let cancelled = false;
    loadVehicleCatalogImage(
      { year, make: make!.trim(), model: model!.trim() },
      getToken,
    )
      .then((result) => {
        if (cancelled) return;
        setCatalog(result);
        onCatalogRef.current?.(result);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalog(null);
        onCatalogRef.current?.(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userPhoto, identityKnown, year, make, model, lookupEnabled]);

  if (userPhoto) {
    return (
      // Household uploads may be remote signed URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={userPhoto}
        alt={label}
        className="h-full w-full bg-[#e4e7ee] object-contain"
        data-testid="garage-vehicle-photo"
        data-photo-source="user"
        loading="lazy"
      />
    );
  }

  if (catalog?.status === "ready" && catalog.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={catalog.url}
        alt={label}
        className="h-full w-full bg-[#e4e7ee] object-contain"
        data-testid="garage-vehicle-photo"
        data-photo-source="catalog"
        loading="lazy"
      />
    );
  }

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

  const fallback = genericVehicleRaster({ bodyClass, registrationType });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fallback}
      alt=""
      className="h-full w-full bg-[#e4e7ee] object-contain"
      data-testid="garage-vehicle-photo"
      data-photo-source="generic"
      loading="lazy"
    />
  );
}
