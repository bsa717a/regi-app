import type { DocumentType } from "@prisma/client";
import {
  ApiError,
  confirmDocumentUpload,
  putFileToSignedUrl,
  requestDocumentUploadUrl,
} from "@/lib/api/client";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/documents/constants";
import type { DocumentDto } from "@/lib/documents/types";
import { validateClientFile } from "@/lib/documents/validation";

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

export function inferContentType(file: File): string {
  const typed = file.type.trim().toLowerCase();
  if (typed && (ALLOWED_CONTENT_TYPES as readonly string[]).includes(typed)) {
    return typed;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_CONTENT_TYPE[ext] ?? typed;
}

export function validateUploadFile(
  file: File,
): { ok: true; contentType: string } | { ok: false; error: string } {
  const contentType = inferContentType(file);
  const result = validateClientFile({
    type: contentType,
    size: file.size,
    name: file.name,
  });
  if (!result.ok) return result;
  return { ok: true, contentType };
}

export async function uploadDocumentToVault(input: {
  token: string;
  registrationId: string;
  type: DocumentType;
  file: File;
  /** Optional — concierge renewal uploads land in the vault + link to the renewal. */
  renewalId?: string | null;
  onProgress?: (percent: number) => void;
}): Promise<DocumentDto> {
  const checked = validateUploadFile(input.file);
  if (!checked.ok) {
    throw new ApiError(checked.error, 400);
  }

  const signed = await requestDocumentUploadUrl(input.token, {
    registrationId: input.registrationId,
    filename: input.file.name,
    contentType: checked.contentType,
    contentLength: input.file.size,
  });

  // Progress: 0–90 for GCS PUT, 90–100 for confirm.
  input.onProgress?.(0);
  await putFileToSignedUrl(
    signed.uploadUrl,
    input.file,
    signed.requiredHeaders,
    (pct) => input.onProgress?.(Math.min(90, Math.round(pct * 0.9))),
  );

  input.onProgress?.(92);
  const document = await confirmDocumentUpload(input.token, {
    registrationId: input.registrationId,
    type: input.type,
    gcsPath: signed.gcsPath,
    originalFilename: input.file.name,
    renewalId: input.renewalId,
  });
  input.onProgress?.(100);
  return document;
}

export { MAX_UPLOAD_BYTES };
