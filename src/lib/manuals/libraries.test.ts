import { describe, expect, it } from "vitest";
import { resolveOfficialManualLibrary } from "@/lib/manuals/libraries";

describe("resolveOfficialManualLibrary", () => {
  it("returns Toyota deep link for passenger Toyota with year and model", () => {
    expect(
      resolveOfficialManualLibrary({
        type: "passenger",
        make: "TOYOTA",
        model: "RAV4",
        year: 2022,
      }),
    ).toEqual({
      label: "Toyota Owners manuals",
      url: "https://www.toyota.com/owners/warranty-owners-manuals/vehicle/rav4/2022/",
      pdfLikely: false,
    });
  });

  it("returns Honda Powersports for OHV Honda", () => {
    expect(
      resolveOfficialManualLibrary({
        type: "ohv",
        make: "Honda",
        model: "TRX420",
        year: 2020,
      }).url,
    ).toBe("https://powersports.honda.com/downloads/owners-manuals");
  });

  it("returns type default when make is unknown", () => {
    expect(
      resolveOfficialManualLibrary({
        type: "motorhome",
        make: "Unknown Coach",
        model: null,
        year: null,
      }).label,
    ).toBe("Winnebago Owner Resources");
  });
});
