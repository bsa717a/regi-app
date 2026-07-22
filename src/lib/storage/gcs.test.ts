import { describe, expect, it, vi } from "vitest";
import {
  CONTENT_LENGTH_RANGE_HEADER,
  DOWNLOAD_URL_TTL_MS,
  MAX_UPLOAD_BYTES,
  UPLOAD_URL_TTL_MS,
} from "@/lib/documents/constants";
import {
  buildDownloadSignedUrlConfig,
  buildUploadSignedUrlConfig,
  createDownloadSignedUrl,
  createUploadSignedUrl,
} from "@/lib/storage/gcs";

describe("signed URL option construction", () => {
  it("builds V4 write options with content-type and length-range", () => {
    const now = 1_700_000_000_000;
    const config = buildUploadSignedUrlConfig({
      contentType: "application/pdf",
      now,
    });

    expect(config).toEqual({
      version: "v4",
      action: "write",
      expires: now + UPLOAD_URL_TTL_MS,
      contentType: "application/pdf",
      extensionHeaders: {
        [CONTENT_LENGTH_RANGE_HEADER]: `0,${MAX_UPLOAD_BYTES}`,
      },
    });
  });

  it("builds short-lived V4 read options with disposition", () => {
    const now = 1_700_000_000_000;
    const config = buildDownloadSignedUrlConfig({
      filename: 'card "1".pdf',
      now,
    });

    expect(config.version).toBe("v4");
    expect(config.action).toBe("read");
    expect(config.expires).toBe(now + DOWNLOAD_URL_TTL_MS);
    expect(config.responseDisposition).toBe(
      'attachment; filename="card 1.pdf"',
    );
  });

  it("createUploadSignedUrl uses injected file mock (no real GCS)", async () => {
    const getSignedUrl = vi.fn().mockResolvedValue([
      "https://storage.googleapis.com/signed-upload",
    ]);

    const result = await createUploadSignedUrl({
      gcsPath: "households/hh/vehicles/v/uuid-a.pdf",
      contentType: "image/jpeg",
      file: { getSignedUrl },
      now: 1_000,
    });

    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl.mock.calls[0]?.[0]).toMatchObject({
      version: "v4",
      action: "write",
      contentType: "image/jpeg",
      extensionHeaders: {
        [CONTENT_LENGTH_RANGE_HEADER]: `0,${MAX_UPLOAD_BYTES}`,
      },
    });
    expect(result.uploadUrl).toContain("signed-upload");
    expect(result.requiredHeaders["Content-Type"]).toBe("image/jpeg");
    expect(result.requiredHeaders[CONTENT_LENGTH_RANGE_HEADER]).toBe(
      `0,${MAX_UPLOAD_BYTES}`,
    );
  });

  it("createDownloadSignedUrl uses injected file mock (no real GCS)", async () => {
    const getSignedUrl = vi.fn().mockResolvedValue([
      "https://storage.googleapis.com/signed-download",
    ]);

    const result = await createDownloadSignedUrl({
      gcsPath: "households/hh/vehicles/v/uuid-a.pdf",
      filename: "a.pdf",
      file: { getSignedUrl },
      now: 2_000,
    });

    expect(getSignedUrl).toHaveBeenCalledWith({
      version: "v4",
      action: "read",
      expires: 2_000 + DOWNLOAD_URL_TTL_MS,
      responseDisposition: 'attachment; filename="a.pdf"',
    });
    expect(result.downloadUrl).toContain("signed-download");
  });
});
