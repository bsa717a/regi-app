import Link from "next/link";
import type { CatalogAttributionDto } from "@/lib/registrations/vehicleCatalog/client";

export function VehiclePhotoCredit({
  attribution,
}: {
  attribution: CatalogAttributionDto;
}) {
  return (
    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      Photo: {attribution.author}
      {" · "}
      {attribution.licenseUrl ? (
        <a
          href={attribution.licenseUrl}
          className="underline-offset-2 hover:underline"
          rel="license"
        >
          {attribution.license}
        </a>
      ) : (
        attribution.license
      )}
      {" · "}
      <a
        href={attribution.sourceUrl}
        className="underline-offset-2 hover:underline"
        rel="noopener noreferrer"
      >
        Source
      </a>
      {attribution.shareAlike
        ? " · Share-alike: reuse only under the same license, with this credit."
        : null}
      {" · "}
      <Link href="/credits" className="underline-offset-2 hover:underline">
        All photo credits
      </Link>
    </p>
  );
}
