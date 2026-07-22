import { Storage, type Bucket, type File } from "@google-cloud/storage";
import {
  CONTENT_LENGTH_RANGE_HEADER,
  DOWNLOAD_URL_TTL_MS,
  MAX_UPLOAD_BYTES,
  UPLOAD_URL_TTL_MS,
} from "@/lib/documents/constants";
import { contentLengthRangeValue } from "@/lib/documents/validation";

let storageSingleton: Storage | undefined;

export function getBucketName(): string {
  const bucket = process.env.GCS_BUCKET?.trim();
  if (!bucket) {
    throw new Error("GCS_BUCKET is not configured");
  }
  return bucket;
}

/**
 * Storage client via Application Default Credentials
 * (GOOGLE_APPLICATION_CREDENTIALS / Cloud Run SA).
 * Bucket stays private — only short-lived V4 signed URLs are issued.
 */
export function getStorage(): Storage {
  if (!storageSingleton) {
    storageSingleton = new Storage({
      projectId: process.env.GCP_PROJECT_ID || undefined,
    });
  }
  return storageSingleton;
}

export function getBucket(): Bucket {
  return getStorage().bucket(getBucketName());
}

export function getObjectFile(gcsPath: string): File {
  return getBucket().file(gcsPath);
}

export type SignedUploadOptions = {
  gcsPath: string;
  contentType: string;
  /** Upper bound for x-goog-content-length-range (defaults to MAX_UPLOAD_BYTES). */
  maxBytes?: number;
  /** Override TTL for tests. */
  ttlMs?: number;
  /** Injected file for unit tests — avoids hitting real GCS. */
  file?: Pick<File, "getSignedUrl">;
  now?: number;
};

export type SignedUploadResult = {
  uploadUrl: string;
  gcsPath: string;
  requiredHeaders: Record<string, string>;
  expiresAt: Date;
  /** Options that were passed to getSignedUrl (useful for tests). */
  signedUrlConfig: {
    version: "v4";
    action: "write";
    expires: number;
    contentType: string;
    extensionHeaders: Record<string, string>;
  };
};

/**
 * Build the V4 signed PUT config. Extracted so tests can assert conditions
 * without calling the Storage client.
 */
export function buildUploadSignedUrlConfig(input: {
  contentType: string;
  maxBytes?: number;
  ttlMs?: number;
  now?: number;
}): SignedUploadResult["signedUrlConfig"] {
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? UPLOAD_URL_TTL_MS;
  const maxBytes = input.maxBytes ?? MAX_UPLOAD_BYTES;
  const range = contentLengthRangeValue(maxBytes);

  return {
    version: "v4",
    action: "write",
    expires: now + ttlMs,
    contentType: input.contentType,
    extensionHeaders: {
      [CONTENT_LENGTH_RANGE_HEADER]: range,
    },
  };
}

export async function createUploadSignedUrl(
  input: SignedUploadOptions,
): Promise<SignedUploadResult> {
  const signedUrlConfig = buildUploadSignedUrlConfig({
    contentType: input.contentType,
    maxBytes: input.maxBytes,
    ttlMs: input.ttlMs,
    now: input.now,
  });

  const file = input.file ?? getObjectFile(input.gcsPath);
  const [uploadUrl] = await file.getSignedUrl(signedUrlConfig);

  return {
    uploadUrl,
    gcsPath: input.gcsPath,
    requiredHeaders: {
      "Content-Type": input.contentType,
      [CONTENT_LENGTH_RANGE_HEADER]:
        signedUrlConfig.extensionHeaders[CONTENT_LENGTH_RANGE_HEADER]!,
    },
    expiresAt: new Date(signedUrlConfig.expires),
    signedUrlConfig,
  };
}

export type SignedDownloadOptions = {
  gcsPath: string;
  /** Suggested filename for Content-Disposition. */
  filename?: string;
  ttlMs?: number;
  file?: Pick<File, "getSignedUrl">;
  now?: number;
};

export type SignedDownloadResult = {
  downloadUrl: string;
  expiresAt: Date;
  signedUrlConfig: {
    version: "v4";
    action: "read";
    expires: number;
    responseDisposition?: string;
  };
};

export function buildDownloadSignedUrlConfig(input: {
  filename?: string;
  ttlMs?: number;
  now?: number;
}): SignedDownloadResult["signedUrlConfig"] {
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? DOWNLOAD_URL_TTL_MS;
  const config: SignedDownloadResult["signedUrlConfig"] = {
    version: "v4",
    action: "read",
    expires: now + ttlMs,
  };

  if (input.filename) {
    const safe = input.filename.replace(/"/g, "");
    config.responseDisposition = `attachment; filename="${safe}"`;
  }

  return config;
}

export async function createDownloadSignedUrl(
  input: SignedDownloadOptions,
): Promise<SignedDownloadResult> {
  const signedUrlConfig = buildDownloadSignedUrlConfig({
    filename: input.filename,
    ttlMs: input.ttlMs,
    now: input.now,
  });

  const file = input.file ?? getObjectFile(input.gcsPath);
  const [downloadUrl] = await file.getSignedUrl(signedUrlConfig);

  return {
    downloadUrl,
    expiresAt: new Date(signedUrlConfig.expires),
    signedUrlConfig,
  };
}

export async function objectExists(gcsPath: string): Promise<boolean> {
  const [exists] = await getObjectFile(gcsPath).exists();
  return exists;
}

export async function deleteObject(gcsPath: string): Promise<void> {
  try {
    await getObjectFile(gcsPath).delete({ ignoreNotFound: true });
  } catch (err) {
    // Surface unexpected errors; ignoreNotFound covers 404.
    throw err;
  }
}

/** Test helper to reset the singleton between suites. */
export function __resetStorageForTests(): void {
  storageSingleton = undefined;
}
