import type { DocumentType } from "@prisma/client";
import { isVehiclePhotoGcsPath } from "@/lib/storage/gcsPaths";
import {
  ALLOWED_CONTENT_TYPES,
  DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
  type AllowedContentType,
} from "@/lib/documents/constants";

export function isAllowedContentType(
  value: string,
): value is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(value);
}

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function sanitizeFilename(filename: string): string {
  const base = filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.trim() || "document";

  const cleaned = base
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  return cleaned.length > 0 ? cleaned : "document";
}

/**
 * Build a private object key. Never expose this as a public URL.
 * Pattern: households/{householdId}/registrations/{registrationId}/{uuid}-{filename}
 */
export function buildGcsPath(input: {
  householdId: string;
  registrationId: string;
  originalFilename: string;
  uuid?: string;
}): string {
  const id = input.uuid ?? crypto.randomUUID();
  const safe = sanitizeFilename(input.originalFilename);
  return `households/${input.householdId}/registrations/${input.registrationId}/${id}-${safe}`;
}

export function contentLengthRangeValue(
  maxBytes: number = MAX_UPLOAD_BYTES,
): string {
  return `0,${maxBytes}`;
}

export type UploadUrlRequest = {
  registrationId: string;
  filename: string;
  contentType: AllowedContentType;
  contentLength: number;
};

export function parseUploadUrlBody(
  body: Record<string, unknown>,
): { ok: true; data: UploadUrlRequest } | { ok: false; error: string } {
  if (typeof body.registrationId !== "string" || !body.registrationId.trim()) {
    return { ok: false, error: "registrationId is required" };
  }

  if (typeof body.filename !== "string" || !body.filename.trim()) {
    return { ok: false, error: "filename is required" };
  }

  if (typeof body.contentType !== "string" || !body.contentType.trim()) {
    return { ok: false, error: "contentType is required" };
  }

  const contentType = body.contentType.trim().toLowerCase();
  if (!isAllowedContentType(contentType)) {
    return {
      ok: false,
      error:
        "Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC, and PDF.",
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
      error: `File is too large. Maximum size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    };
  }

  return {
    ok: true,
    data: {
      registrationId: body.registrationId.trim(),
      filename: body.filename.trim(),
      contentType,
      contentLength,
    },
  };
}

export type CreateDocumentRequest = {
  registrationId: string;
  type: DocumentType;
  gcsPath: string;
  originalFilename: string;
  /** Optional — used by the future renewal concierge flow. */
  renewalId?: string | null;
};

export function parseCreateDocumentBody(
  body: Record<string, unknown>,
): { ok: true; data: CreateDocumentRequest } | { ok: false; error: string } {
  if (typeof body.registrationId !== "string" || !body.registrationId.trim()) {
    return { ok: false, error: "registrationId is required" };
  }

  if (typeof body.type !== "string" || !isDocumentType(body.type)) {
    return {
      ok: false,
      error:
        "type must be one of: registration, insurance, other, title, emissions, temp_permit",
    };
  }

  if (typeof body.gcsPath !== "string" || !body.gcsPath.trim()) {
    return { ok: false, error: "gcsPath is required" };
  }

  if (
    typeof body.originalFilename !== "string" ||
    !body.originalFilename.trim()
  ) {
    return { ok: false, error: "originalFilename is required" };
  }

  const gcsPath = body.gcsPath.trim();
  if (
    gcsPath.includes("..") ||
    gcsPath.startsWith("/") ||
    !gcsPath.startsWith("households/")
  ) {
    return { ok: false, error: "Invalid gcsPath" };
  }
  if (isVehiclePhotoGcsPath(gcsPath)) {
    return {
      ok: false,
      error: "Garage photos cannot be stored as documents",
    };
  }

  let renewalId: string | null | undefined;
  if (body.renewalId === undefined) {
    renewalId = undefined;
  } else if (body.renewalId === null || body.renewalId === "") {
    renewalId = null;
  } else if (typeof body.renewalId === "string" && body.renewalId.trim()) {
    renewalId = body.renewalId.trim();
  } else {
    return { ok: false, error: "renewalId must be a string or null" };
  }

  return {
    ok: true,
    data: {
      registrationId: body.registrationId.trim(),
      type: body.type,
      gcsPath,
      originalFilename: sanitizeFilename(body.originalFilename.trim()),
      renewalId,
    },
  };
}

export type PatchDocumentRequest = {
  originalFilename: string;
};

function filenameExtension(filename: string): string {
  const base = filename.trim();
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot).toLowerCase();
}

/** Keep the stored file extension when the user omits it on rename. */
export function preserveFilenameExtension(
  nextFilename: string,
  currentFilename: string,
): string {
  const sanitized = sanitizeFilename(nextFilename);
  if (filenameExtension(sanitized)) return sanitized;
  const extension = filenameExtension(currentFilename);
  return extension ? `${sanitized}${extension}` : sanitized;
}

export function parsePatchDocumentBody(
  body: Record<string, unknown>,
  currentFilename?: string,
): { ok: true; data: PatchDocumentRequest } | { ok: false; error: string } {
  if (
    typeof body.originalFilename !== "string" ||
    !body.originalFilename.trim()
  ) {
    return { ok: false, error: "originalFilename is required" };
  }

  const sanitized = sanitizeFilename(body.originalFilename.trim());
  const originalFilename = currentFilename
    ? preserveFilenameExtension(sanitized, currentFilename)
    : sanitized;

  return {
    ok: true,
    data: { originalFilename },
  };
}

export function validateClientFile(file: {
  type: string;
  size: number;
  name: string;
}): { ok: true } | { ok: false; error: string } {
  const contentType = file.type.trim().toLowerCase();
  if (!contentType || !isAllowedContentType(contentType)) {
    return {
      ok: false,
      error:
        "Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC, and PDF.",
    };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: "File appears empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File is too large. Maximum size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    };
  }
  if (!file.name.trim()) {
    return { ok: false, error: "Filename is required." };
  }
  return { ok: true };
}
