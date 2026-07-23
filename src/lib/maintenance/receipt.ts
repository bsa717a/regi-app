import { MAX_UPLOAD_BYTES } from "@/lib/documents/constants";
import {
  isAllowedPhotoContentType,
  type AllowedPhotoContentType,
} from "@/lib/registrations/photoTypes";
import { createDownloadSignedUrl } from "@/lib/storage/gcs";

export const RECEIPT_READ_URL_TTL_MS = 24 * 60 * 60 * 1000;

export function buildReceiptGcsPath(input: {
  householdId: string;
  registrationId: string;
  logId: string;
  uuid?: string;
}): string {
  const id = input.uuid ?? crypto.randomUUID();
  return `households/${input.householdId}/registrations/${input.registrationId}/maintenance/${input.logId}/receipt/${id}.jpg`;
}

export function validateReceiptGcsPath(
  gcsPath: string,
  input: { householdId: string; registrationId: string; logId: string },
): boolean {
  const prefix = `households/${input.householdId}/registrations/${input.registrationId}/maintenance/${input.logId}/receipt/`;
  return gcsPath.startsWith(prefix) && !gcsPath.includes("..");
}

export type ReceiptUploadUrlRequest = {
  filename: string;
  contentType: AllowedPhotoContentType;
  contentLength: number;
};

export function parseReceiptUploadUrlBody(
  body: Record<string, unknown>,
): { ok: true; data: ReceiptUploadUrlRequest } | { ok: false; error: string } {
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
      error: `File is too large. Max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
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

export async function resolveReceiptUrl(
  gcsPath: string | null | undefined,
): Promise<string | null> {
  if (!gcsPath) return null;
  try {
    const signed = await createDownloadSignedUrl({
      gcsPath,
      ttlMs: RECEIPT_READ_URL_TTL_MS,
    });
    return signed.downloadUrl;
  } catch {
    return null;
  }
}
