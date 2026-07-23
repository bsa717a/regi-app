/** Client-safe photo MIME types and validation (no server/GCS imports). */

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
