export type CatalogAttributionDto = {
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  sourceTitle: string;
  shareAlike: boolean;
  retrievedAt: string;
};

export type CatalogClientResult = {
  status: "ready" | "unavailable" | "missing";
  url: string | null;
  attribution: CatalogAttributionDto | null;
  generationLabel: string | null;
  yearFrom: number | null;
  yearTo: number | null;
};

const inflight = new Map<string, Promise<CatalogClientResult>>();

function emptyResult(): CatalogClientResult {
  return {
    status: "missing",
    url: null,
    attribution: null,
    generationLabel: null,
    yearFrom: null,
    yearTo: null,
  };
}

/**
 * One lookup per make / model / year, shared by every card on the page.
 * The card paints its fallback before this promise resolves.
 */
export function loadVehicleCatalogImage(
  query: { year: number; make: string; model: string },
  getIdToken: () => Promise<string | null>,
): Promise<CatalogClientResult> {
  const key = `${query.year}|${query.make.trim().toLowerCase()}|${query.model.trim().toLowerCase()}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const pending = requestCatalog(query, getIdToken).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

async function requestCatalog(
  query: { year: number; make: string; model: string },
  getIdToken: () => Promise<string | null>,
): Promise<CatalogClientResult> {
  const token = await getIdToken();
  if (!token) return emptyResult();
  const response = await fetch("/api/vehicle-catalog/resolve", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  });
  if (!response.ok) return emptyResult();
  const body = (await response.json()) as Partial<CatalogClientResult>;
  if (body.status !== "ready" && body.status !== "unavailable" && body.status !== "missing") {
    return emptyResult();
  }
  return {
    status: body.status,
    url: typeof body.url === "string" ? body.url : null,
    attribution: body.attribution ?? null,
    generationLabel: body.generationLabel ?? null,
    yearFrom: body.yearFrom ?? null,
    yearTo: body.yearTo ?? null,
  };
}
