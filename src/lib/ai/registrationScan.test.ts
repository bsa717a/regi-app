import { describe, expect, it } from "vitest";
import { parseRegistrationScanResponse } from "@/lib/ai/registrationScan";

describe("parseRegistrationScanResponse", () => {
  it("parses a complete passenger registration scan", () => {
    const result = parseRegistrationScanResponse(
      JSON.stringify({
        registrationType: "passenger",
        vin: "1GNSKCKC8MR312456",
        plate: "abc123",
        hin: null,
        serial: null,
        state: "ut",
        year: 2021,
        make: "Chevrolet",
        model: "Tahoe",
        registrationExpiresOn: "2026-12-31",
        confidence: 0.92,
      }),
    );

    expect(result).toEqual({
      registrationType: "passenger",
      vin: "1GNSKCKC8MR312456",
      plate: "ABC123",
      hin: null,
      serial: null,
      state: "UT",
      year: 2021,
      make: "Chevrolet",
      model: "Tahoe",
      registrationExpiresOn: "2026-12-31",
      confidence: 0.92,
    });
  });

  it("drops invalid VIN, state, year, and type values", () => {
    const result = parseRegistrationScanResponse(
      JSON.stringify({
        registrationType: "spaceship",
        vin: "TOO-SHORT",
        plate: "XYZ789",
        hin: null,
        serial: null,
        state: "Utah",
        year: 1800,
        make: "Ford",
        model: "F-150",
        registrationExpiresOn: "not-a-date",
        confidence: 4,
      }),
    );

    expect(result.registrationType).toBeNull();
    expect(result.vin).toBeNull();
    expect(result.state).toBeNull();
    expect(result.year).toBeNull();
    expect(result.registrationExpiresOn).toBeNull();
    expect(result.confidence).toBe(1);
    expect(result.plate).toBe("XYZ789");
    expect(result.make).toBe("Ford");
    expect(result.model).toBe("F-150");
  });

  it("extracts JSON embedded in extra model text", () => {
    const result = parseRegistrationScanResponse(
      `Here is the data:\n${JSON.stringify({
        registrationType: "boat",
        vin: null,
        plate: "UT1234AB",
        hin: "US-ABC12345D678",
        serial: null,
        state: "UT",
        year: 2019,
        make: "Sea Ray",
        model: "SPX 190",
        registrationExpiresOn: "2025-06-01",
        confidence: 0.8,
      })}\nThanks.`,
    );

    expect(result.registrationType).toBe("boat");
    expect(result.hin).toBe("US-ABC12345D678");
    expect(result.state).toBe("UT");
  });

  it("throws when the model returns a non-object", () => {
    expect(() => parseRegistrationScanResponse('"nope"')).toThrow(
      "Model returned invalid JSON object",
    );
  });
});
