import type { DocumentType } from "@prisma/client";

/** Max upload size enforced client-side and via signed-URL header conditions. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export const DOCUMENT_TYPES: DocumentType[] = [
  "registration",
  "insurance",
  "other",
  "title",
  "emissions",
  "temp_permit",
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  registration: "Registration",
  insurance: "Insurance",
  other: "Other",
  title: "Title",
  emissions: "Emissions",
  temp_permit: "Temporary permit",
};

/** Short-lived download signed URL TTL. */
export const DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000;

/** Upload signed URL TTL (time to complete the PUT). */
export const UPLOAD_URL_TTL_MS = 15 * 60 * 1000;

export const CONTENT_LENGTH_RANGE_HEADER = "x-goog-content-length-range";
