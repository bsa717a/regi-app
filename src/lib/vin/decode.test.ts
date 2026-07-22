import { describe, expect, it, vi } from "vitest";
import {
  cleanVinDecodeResult,
  decodeVin,
  hasUsableDecode,
  isValidVinFormat,
  normalizeVin,
} from "@/lib/vin/decode";

describe("VIN format", () => {
  it("normalizes and validates 17-char VINs", () => {
    expect(normalizeVin(" 1gnskckc8mr312456 ")).toBe("1GNSKCKC8MR312456");
    expect(isValidVinFormat("1GNSKCKC8MR312456")).toBe(true);
    expect(isValidVinFormat("SHORT")).toBe(false);
    expect(isValidVinFormat("1GNSKCKC8MR31245I")).toBe(false); // I invalid
  });
});

describe("cleanVinDecodeResult", () => {
  it("extracts year/make/model/bodyClass from NHTSA row", () => {
    const cleaned = cleanVinDecodeResult({
      ModelYear: "2021",
      Make: "CHEVROLET",
      Model: "Tahoe",
      BodyClass: "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
      ErrorCode: "0",
    });

    expect(cleaned).toEqual({
      year: 2021,
      make: "CHEVROLET",
      model: "Tahoe",
      bodyClass: "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
    });
    expect(hasUsableDecode(cleaned)).toBe(true);
  });

  it("treats empty / Not Applicable as null", () => {
    const cleaned = cleanVinDecodeResult({
      ModelYear: "",
      Make: "Not Applicable",
      Model: "null",
      BodyClass: "   ",
    });
    expect(cleaned).toEqual({
      year: null,
      make: null,
      model: null,
      bodyClass: null,
    });
    expect(hasUsableDecode(cleaned)).toBe(false);
  });
});

describe("decodeVin", () => {
  it("rejects invalid VIN before calling fetch", async () => {
    const fetchImpl = vi.fn();
    const result = await decodeVin("TOO-SHORT", { fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.soft).toBe(true);
      expect(result.error).toMatch(/17 characters/i);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns cleaned vehicle on successful NHTSA response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Results: [
          {
            ModelYear: "2021",
            Make: "CHEVROLET",
            Model: "Tahoe",
            BodyClass: "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
          },
        ],
      }),
    });

    const result = await decodeVin("1GNSKCKC8MR312456", { fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.vin).toBe("1GNSKCKC8MR312456");
      expect(result.vehicle.year).toBe(2021);
      expect(result.vehicle.make).toBe("CHEVROLET");
      expect(result.vehicle.model).toBe("Tahoe");
      expect(result.vehicle.bodyClass).toMatch(/Sport Utility/i);
    }
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("soft-fails on HTTP errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const result = await decodeVin("1GNSKCKC8MR312456", { fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.soft).toBe(true);
      expect(result.error).toMatch(/unavailable|manually/i);
    }
  });

  it("soft-fails on timeout/abort", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("aborted"));
    const result = await decodeVin("1GNSKCKC8MR312456", { fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.soft).toBe(true);
      expect(result.error).toMatch(/timed out|manually/i);
    }
  });

  it("soft-fails when decode has no usable year/make/model", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Results: [{ ModelYear: "", Make: "", Model: "", BodyClass: "" }],
      }),
    });

    const result = await decodeVin("1GNSKCKC8MR312456", { fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.soft).toBe(true);
    }
  });
});
