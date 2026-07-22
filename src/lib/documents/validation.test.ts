import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  CONTENT_LENGTH_RANGE_HEADER,
} from "@/lib/documents/constants";
import {
  buildGcsPath,
  contentLengthRangeValue,
  parseCreateDocumentBody,
  parseUploadUrlBody,
  sanitizeFilename,
  validateClientFile,
} from "@/lib/documents/validation";

describe("sanitizeFilename", () => {
  it("strips path components and unsafe characters", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("My Card!!!.PDF")).toBe("My Card_.PDF");
  });

  it("falls back when empty", () => {
    expect(sanitizeFilename("   ")).toBe("document");
  });
});

describe("buildGcsPath", () => {
  it("uses households/vehicles prefix with uuid and sanitized name", () => {
    const path = buildGcsPath({
      householdId: "hh_1",
      vehicleId: "veh_1",
      originalFilename: "reg card.pdf",
      uuid: "11111111-2222-3333-4444-555555555555",
    });

    expect(path).toBe(
      "households/hh_1/vehicles/veh_1/11111111-2222-3333-4444-555555555555-reg card.pdf",
    );
  });
});

describe("content-type and size validation", () => {
  it("accepts allowed types within size limit", () => {
    const parsed = parseUploadUrlBody({
      vehicleId: "veh_1",
      filename: "card.jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects disallowed content types", () => {
    const parsed = parseUploadUrlBody({
      vehicleId: "veh_1",
      filename: "x.exe",
      contentType: "application/octet-stream",
      contentLength: 100,
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toMatch(/Unsupported file type/i);
    }
  });

  it("rejects files over the max size", () => {
    const parsed = parseUploadUrlBody({
      vehicleId: "veh_1",
      filename: "big.pdf",
      contentType: "application/pdf",
      contentLength: MAX_UPLOAD_BYTES + 1,
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toMatch(/too large/i);
    }
  });

  it("builds content-length-range for signed URL conditions", () => {
    expect(contentLengthRangeValue()).toBe(`0,${MAX_UPLOAD_BYTES}`);
    expect(CONTENT_LENGTH_RANGE_HEADER).toBe("x-goog-content-length-range");
  });

  it("mirrors limits on the client validator", () => {
    expect(
      validateClientFile({
        type: "image/png",
        size: 10,
        name: "a.png",
      }).ok,
    ).toBe(true);
    expect(
      validateClientFile({
        type: "text/plain",
        size: 10,
        name: "a.txt",
      }).ok,
    ).toBe(false);
  });
});

describe("parseCreateDocumentBody", () => {
  it("accepts optional renewalId for the concierge hook", () => {
    const parsed = parseCreateDocumentBody({
      vehicleId: "veh_1",
      type: "insurance",
      gcsPath: "households/hh/vehicles/veh_1/uuid-file.pdf",
      originalFilename: "ins.pdf",
      renewalId: "ren_1",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.renewalId).toBe("ren_1");
      expect(parsed.data.type).toBe("insurance");
    }
  });

  it("rejects invalid document type and path traversal", () => {
    expect(
      parseCreateDocumentBody({
        vehicleId: "veh_1",
        type: "passport",
        gcsPath: "households/hh/vehicles/veh_1/a.pdf",
        originalFilename: "a.pdf",
      }).ok,
    ).toBe(false);

    expect(
      parseCreateDocumentBody({
        vehicleId: "veh_1",
        type: "title",
        gcsPath: "households/hh/../secret",
        originalFilename: "a.pdf",
      }).ok,
    ).toBe(false);
  });
});
