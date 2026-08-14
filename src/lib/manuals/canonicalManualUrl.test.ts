import { describe, expect, it } from "vitest";
import {
  buildCanonicalOwnerManualUrl,
  buildToyotaOwnerManualUrl,
  readCanonicalOwnerManualUrl,
} from "@/lib/manuals/canonicalManualUrl";

describe("buildToyotaOwnerManualUrl", () => {
  it("builds the US Toyota portal URL for year and model", () => {
    expect(
      buildToyotaOwnerManualUrl({ year: 2022, model: "RAV4" }),
    ).toBe(
      "https://www.toyota.com/owners/warranty-owners-manuals/vehicle/rav4/2022/",
    );
  });
});

describe("readCanonicalOwnerManualUrl", () => {
  it("returns a validated Toyota manual URL", () => {
    expect(
      readCanonicalOwnerManualUrl({
        year: 2022,
        make: "TOYOTA",
        model: "RAV4",
      }),
    ).toBe(
      "https://www.toyota.com/owners/warranty-owners-manuals/vehicle/rav4/2022/",
    );
  });

  it("returns null for unsupported makes", () => {
    expect(
      buildCanonicalOwnerManualUrl({
        year: 2021,
        make: "Ford",
        model: "F-150",
      }),
    ).toBeNull();
  });
});
