import type { Registration } from "@prisma/client";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/constants";
import { prisma } from "@/lib/prisma";
import { createDownloadSignedUrl } from "@/lib/storage/gcs";

/** Signed read URL TTL for vehicle photos shown in the garage UI. */
export const PHOTO_READ_URL_TTL_MS = 24 * 60 * 60 * 1000;

export const ALLOWED_PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AllowedPhotoContentType =
  (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number];

export function isAllowedPhotoContentType(
  value: string,
): value is AllowedPhotoContentType {
  return (ALLOWED_PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
}

export function buildPhotoGcsPath(input: {
  householdId: string;
  registrationId: string;
  uuid?: string;
}): string {
  const id = input.uuid ?? crypto.randomUUID();
  return `households/${input.householdId}/registrations/${input.registrationId}/photo/${id}.jpg`;
}

export function validatePhotoGcsPath(
  gcsPath: string,
  input: { householdId: string; registrationId: string },
): boolean {
  const prefix = `households/${input.householdId}/registrations/${input.registrationId}/photo/`;
  return gcsPath.startsWith(prefix) && !gcsPath.includes("..");
}

export type PhotoUploadUrlRequest = {
  filename: string;
  contentType: AllowedPhotoContentType;
  contentLength: number;
};

export function parsePhotoUploadUrlBody(
  body: Record<string, unknown>,
): { ok: true; data: PhotoUploadUrlRequest } | { ok: false; error: string } {
  if (typeof body.filename !== "string" || !body.filename.trim()) {
    return { ok: false, error: "filename is required" };
  }

  if (typeof body.contentType !== "string" || !body.contentType.trim()) {
    return { ok: false, error: "contentType is required" };
  }

  const contentType = body.contentType.trim().toLowerCase();
  if (!isAllowedPhotoContentType(contentType)) {
    return {
      ok: false,
      error: "Unsupported image type. Allowed: JPEG, PNG, WebP, and HEIC.",
    };
  }

  let contentLength: number;
  if (typeof body.contentLength === "number") {
    contentLength = body.contentLength;
  } else if (
    typeof body.contentLength === "string" &&
    body.contentLength.trim()
  ) {
    contentLength = Number(body.contentLength);
  } else {
    return { ok: false, error: "contentLength is required" };
  }

  if (
    !Number.isFinite(contentLength) ||
    !Number.isInteger(contentLength) ||
    contentLength <= 0
  ) {
    return { ok: false, error: "contentLength must be a positive integer" };
  }

  if (contentLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Image is too large. Maximum size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    };
  }

  return {
    ok: true,
    data: {
      filename: body.filename.trim(),
      contentType,
      contentLength,
    },
  };
}

export function parsePhotoConfirmBody(
  body: Record<string, unknown>,
): { ok: true; gcsPath: string } | { ok: false; error: string } {
  if (typeof body.gcsPath !== "string" || !body.gcsPath.trim()) {
    return { ok: false, error: "gcsPath is required" };
  }
  return { ok: true, gcsPath: body.gcsPath.trim() };
}

type RegistrationWithPhoto = Pick<
  Registration,
  "id" | "photoUrl" | "photoGcsPath"
>;

export function isRegistrationDocumentImageFilename(filename: string): boolean {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(filename.trim());
}

function hasPersistedHttpPhotoUrl(photoUrl: string | null): boolean {
  if (!photoUrl) return false;
  try {
    const url = new URL(photoUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function latestRegistrationDocumentPhotoPaths(
  registrationIds: string[],
): Promise<Map<string, string>> {
  if (registrationIds.length === 0) return new Map();

  const documents = await prisma.document.findMany({
    where: {
      registrationId: { in: registrationIds },
      type: "registration",
    },
    orderBy: { createdAt: "desc" },
    select: {
      registrationId: true,
      gcsPath: true,
      originalFilename: true,
    },
  });

  const paths = new Map<string, string>();
  for (const document of documents) {
    if (paths.has(document.registrationId)) continue;
    if (!isRegistrationDocumentImageFilename(document.originalFilename)) {
      continue;
    }
    paths.set(document.registrationId, document.gcsPath);
  }

  return paths;
}

/**
 * Replace photoUrl with a signed read URL when photoGcsPath is set, or fall back
 * to the latest registration-card image in the document vault.
 */
export async function resolvePhotoUrls<T extends RegistrationWithPhoto>(
  registrations: T[],
): Promise<T[]> {
  const docFallbackIds = registrations
    .filter(
      (registration) =>
        !registration.photoGcsPath &&
        !hasPersistedHttpPhotoUrl(registration.photoUrl),
    )
    .map((registration) => registration.id);
  const documentPhotoPaths =
    await latestRegistrationDocumentPhotoPaths(docFallbackIds);

  return Promise.all(
    registrations.map(async (registration) => {
      const gcsPath =
        registration.photoGcsPath ??
        documentPhotoPaths.get(registration.id) ??
        null;

      if (!gcsPath) {
        return registration;
      }

      try {
        const signed = await createDownloadSignedUrl({
          gcsPath,
          ttlMs: PHOTO_READ_URL_TTL_MS,
        });
        return { ...registration, photoUrl: signed.downloadUrl };
      } catch {
        return registration;
      }
    }),
  );
}

export async function resolvePhotoUrl<T extends RegistrationWithPhoto>(
  registration: T,
): Promise<T> {
  const [resolved] = await resolvePhotoUrls([registration]);
  return resolved;
}
