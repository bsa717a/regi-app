import type { ManualUrlContext } from "@/lib/manuals/validateUrl";
import { isValidFreeManualUrl } from "@/lib/manuals/validateUrl";

function normalizeMake(make: string): string {
  return make.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toyotaModelSlug(model: string): string {
  return model.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Deterministic US Toyota owner-manual portal URL when year and model are known. */
export function buildToyotaOwnerManualUrl(input: {
  year: number;
  model: string;
}): string {
  const slug = toyotaModelSlug(input.model);
  return `https://www.toyota.com/owners/warranty-owners-manuals/vehicle/${slug}/${input.year}/`;
}

export function buildCanonicalOwnerManualUrl(input: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string | null {
  if (!input.year || !input.make?.trim() || !input.model?.trim()) return null;

  const make = normalizeMake(input.make);
  if (make === "toyota") {
    return buildToyotaOwnerManualUrl({
      year: input.year,
      model: input.model,
    });
  }

  return null;
}

export function readCanonicalOwnerManualUrl(input: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string | null {
  const url = buildCanonicalOwnerManualUrl(input);
  if (!url) return null;

  const context: ManualUrlContext = {
    make: input.make,
    model: input.model,
    year: input.year,
  };

  return isValidFreeManualUrl(url, context) ? url : null;
}
