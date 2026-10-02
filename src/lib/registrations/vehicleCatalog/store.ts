import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { saveObjectBuffer } from "@/lib/storage/gcs";

const LOCAL_DIR = "data/vehicle-catalog";

export function localCatalogDir(): string {
  return path.resolve(process.cwd(), LOCAL_DIR);
}

export function isSafeCatalogId(id: string): boolean {
  return /^c[a-z0-9]{8,32}$/i.test(id);
}

export function catalogGcsPath(id: string): string {
  return `catalog/vehicles/${id}.webp`;
}

/** Refuse paths that escape the local catalog directory. */
export function resolveLocalCatalogPath(storagePath: string): string | null {
  if (!storagePath || storagePath.includes("\0")) return null;
  const root = localCatalogDir();
  const resolved = path.resolve(storagePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  if (!resolved.endsWith(".webp")) return null;
  return resolved;
}

export function gcsConfigured(): boolean {
  return Boolean(process.env.GCS_BUCKET?.trim());
}

export async function saveCatalogWebp(
  id: string,
  bytes: Buffer,
): Promise<{ gcsPath: string | null; storagePath: string | null }> {
  if (!isSafeCatalogId(id)) {
    throw new Error("Unsafe catalog image id");
  }
  if (gcsConfigured()) {
    const gcsPath = catalogGcsPath(id);
    await saveObjectBuffer({
      gcsPath,
      buffer: bytes,
      contentType: "image/webp",
    });
    return { gcsPath, storagePath: null };
  }
  const dir = localCatalogDir();
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, `${id}.webp`);
  await writeFile(storagePath, bytes);
  return { gcsPath: null, storagePath };
}

export async function readLocalCatalogWebp(storagePath: string): Promise<Buffer | null> {
  const resolved = resolveLocalCatalogPath(storagePath);
  if (!resolved) return null;
  try {
    return await readFile(resolved);
  } catch {
    return null;
  }
}
