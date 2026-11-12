import { randomUUID } from "node:crypto";
import { cacheIdentity } from "@/lib/registrations/vehicleCatalog/identity";
import {
  generateModelRender,
  unpaidModelRenderAvailable,
} from "@/lib/registrations/vehicleCatalog/generateRender";
import { toCatalogWebp } from "@/lib/registrations/vehicleCatalog/processImage";
import {
  isSafeCatalogId,
  saveCatalogWebp,
} from "@/lib/registrations/vehicleCatalog/store";
import {
  allowedImageDownload,
  findLicensedVehiclePhoto,
  type CatalogFetch,
} from "@/lib/registrations/vehicleCatalog/wikimedia";
import type { FreeLicense } from "@/lib/registrations/vehicleCatalog/license";

export type CatalogAttribution = {
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
  sourceTitle: string;
  shareAlike: boolean;
  retrievedAt: string;
};

export type CatalogRow = {
  id: string;
  makeKey: string;
  modelKey: string;
  displayMake: string;
  displayModel: string;
  yearFrom: number;
  yearTo: number;
  generationLabel: string;
  status: "pending" | "ready" | "unavailable";
  gcsPath: string | null;
  storagePath: string | null;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  shareAlike: boolean;
  retrievedAt: Date | null;
  failureReason: string | null;
  updatedAt: Date;
};

export type CatalogLookup = {
  status: "ready" | "unavailable" | "missing";
  url: string | null;
  attribution: CatalogAttribution | null;
  generationLabel: string | null;
  yearFrom: number | null;
  yearTo: number | null;
};

export interface VehicleCatalogCache {
  findCovering(makeKey: string, modelKey: string, year: number): Promise<CatalogRow | null>;
  upsert(row: CatalogRow): Promise<CatalogRow>;
}

const NEGATIVE_MS = 30 * 24 * 60 * 60 * 1000;
const PENDING_MS = 2 * 60 * 1000;
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;

const inflight = new Map<string, Promise<CatalogLookup>>();

export function catalogAssetUrl(id: string): string {
  return `/api/vehicle-catalog/assets/${id}`;
}

export function attributionFromRow(row: CatalogRow): CatalogAttribution | null {
  if (row.status !== "ready" || !row.author || !row.license || !row.sourceUrl) return null;
  return {
    author: row.author,
    license: row.license,
    licenseUrl: row.licenseUrl,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle ?? row.generationLabel,
    shareAlike: row.shareAlike,
    retrievedAt: (row.retrievedAt ?? row.updatedAt).toISOString(),
  };
}

export function lookupFromRow(row: CatalogRow | null): CatalogLookup {
  if (!row || row.status === "pending") {
    return {
      status: "missing",
      url: null,
      attribution: null,
      generationLabel: null,
      yearFrom: null,
      yearTo: null,
    };
  }
  if (row.status === "unavailable") {
    return {
      status: "unavailable",
      url: null,
      attribution: null,
      generationLabel: row.generationLabel,
      yearFrom: row.yearFrom,
      yearTo: row.yearTo,
    };
  }
  return {
    status: "ready",
    url: catalogAssetUrl(row.id),
    attribution: attributionFromRow(row),
    generationLabel: row.generationLabel,
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
  };
}

function displayName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 80);
}

function fresh(row: CatalogRow, now: number, ttl: number): boolean {
  return now - row.updatedAt.getTime() < ttl;
}

async function downloadPhoto(url: string, fetchImpl: CatalogFetch): Promise<Buffer> {
  if (!allowedImageDownload(url)) {
    throw new Error("Refusing vehicle photo from an unexpected host");
  }
  const response = await fetchImpl(new URL(url), {
    headers: {
      "User-Agent": "RegiApp/1.0 (https://app.regireg.com; vehicle-catalog)",
      Accept: "image/jpeg,image/png,image/webp",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Photo download failed (${response.status})`);
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > MAX_DOWNLOAD_BYTES) throw new Error("Photo download was too large");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_DOWNLOAD_BYTES) {
    throw new Error("Photo download was empty or too large");
  }
  return bytes;
}

export type ResolveDeps = {
  cache: VehicleCatalogCache;
  fetchImpl?: CatalogFetch;
  now?: Date;
  saveBytes?: typeof saveCatalogWebp;
  encode?: (bytes: Buffer) => Promise<Buffer>;
  newId?: () => string;
};

async function resolveUncached(
  query: { year: number; make: string; model: string },
  identity: { makeKey: string; modelKey: string },
  deps: ResolveDeps,
): Promise<CatalogLookup> {
  const now = deps.now ?? new Date();
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const saveBytes = deps.saveBytes ?? saveCatalogWebp;
  const encode = deps.encode ?? toCatalogWebp;
  const newId = deps.newId ?? (() => `c${randomUUID().replace(/-/g, "").slice(0, 24)}`);

  const base = {
    makeKey: identity.makeKey,
    modelKey: identity.modelKey,
    displayMake: displayName(query.make),
    displayModel: displayName(query.model),
    gcsPath: null,
    storagePath: null,
    author: null,
    license: null as string | null,
    licenseUrl: null,
    sourceUrl: null,
    sourceTitle: null,
    shareAlike: false,
    retrievedAt: now,
    updatedAt: now,
  };

  try {
    const photo = await findLicensedVehiclePhoto(
      query,
      fetchImpl,
      now.getUTCFullYear(),
    );
    if (!photo) {
      if (unpaidModelRenderAvailable()) {
        await generateModelRender();
      }
      const row: CatalogRow = {
        ...base,
        id: newId(),
        yearFrom: query.year,
        yearTo: query.year,
        generationLabel: `${query.year} ${displayName(query.make)} ${displayName(query.model)}`,
        status: "unavailable",
        failureReason: unpaidModelRenderAvailable()
          ? "No free photo and the render did not produce an image"
          : "No free photo. Unpaid per-model image generation is not configured.",
      };
      return lookupFromRow(await deps.cache.upsert(row));
    }

    const bytes = await downloadPhoto(photo.downloadUrl, fetchImpl);
    const webp = await encode(bytes);
    const id = newId();
    if (!isSafeCatalogId(id)) throw new Error("Unsafe catalog image id");
    const stored = await saveBytes(id, webp);
    const license: FreeLicense = photo.license;
    const row: CatalogRow = {
      ...base,
      id,
      yearFrom: photo.yearFrom,
      yearTo: photo.yearTo,
      generationLabel: photo.generationLabel,
      status: "ready",
      gcsPath: stored.gcsPath,
      storagePath: stored.storagePath,
      author: photo.author,
      license: license.name,
      licenseUrl: license.url,
      sourceUrl: photo.sourceUrl,
      sourceTitle: photo.sourceTitle,
      shareAlike: license.shareAlike,
      failureReason: null,
    };
    return lookupFromRow(await deps.cache.upsert(row));
  } catch (err) {
    const row: CatalogRow = {
      ...base,
      id: newId(),
      yearFrom: query.year,
      yearTo: query.year,
      generationLabel: `${query.year} ${displayName(query.make)} ${displayName(query.model)}`,
      status: "unavailable",
      failureReason: err instanceof Error ? err.message.slice(0, 300) : "Lookup failed",
    };
    return lookupFromRow(await deps.cache.upsert(row));
  }
}

/**
 * Cached per make / model / generation. Callers render a generic raster
 * until this returns; it must not run on the garage list request.
 */
export async function resolveVehicleCatalog(
  query: { year: number; make: string; model: string },
  deps: ResolveDeps,
): Promise<CatalogLookup> {
  const identity = cacheIdentity(query.make, query.model);
  if (!identity || !Number.isInteger(query.year)) {
    return lookupFromRow(null);
  }
  const now = deps.now ?? new Date();
  const existing = await deps.cache.findCovering(
    identity.makeKey,
    identity.modelKey,
    query.year,
  );
  if (existing?.status === "ready") return lookupFromRow(existing);
  if (existing?.status === "unavailable" && fresh(existing, now.getTime(), NEGATIVE_MS)) {
    return lookupFromRow(existing);
  }
  if (existing?.status === "pending" && fresh(existing, now.getTime(), PENDING_MS)) {
    return lookupFromRow(null);
  }

  const flightKey = `${identity.makeKey}|${identity.modelKey}|${query.year}`;
  const current = inflight.get(flightKey);
  if (current) return current;

  const work = resolveUncached(query, identity, deps).finally(() => {
    inflight.delete(flightKey);
  });
  inflight.set(flightKey, work);
  return work;
}
