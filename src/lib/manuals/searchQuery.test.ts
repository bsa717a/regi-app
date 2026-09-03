import { describe, expect, it } from "vitest";
import {
  buildManualSearchQuery,
  manualDocumentLabel,
} from "@/lib/manuals/searchQuery";

describe("manualDocumentLabel", () => {
  it("labels each registration type", () => {
    expect(manualDocumentLabel("motorhome")).toMatch(/RV|motorhome/i);
    expect(manualDocumentLabel("motorcycle")).toMatch(/motorcycle/i);
    expect(manualDocumentLabel("snowmobile")).toMatch(/snowmobile/i);
    expect(manualDocumentLabel("ohv")).toMatch(/OHV|ATV/i);
    expect(manualDocumentLabel("boat")).toMatch(/boat/i);
    expect(manualDocumentLabel("trailer")).toMatch(/trailer/i);
    expect(manualDocumentLabel("passenger")).toMatch(/owner/i);
  });
});

describe("buildManualSearchQuery", () => {
  it("builds type-specific search queries", () => {
    expect(
      buildManualSearchQuery({
        type: "motorhome",
        year: 2022,
        make: "Winnebago",
        model: "View",
      }),
    ).toBe("2022 Winnebago View RV / motorhome owner's manual pdf");

    expect(
      buildManualSearchQuery({
        type: "snowmobile",
        year: 2021,
        make: "Ski-Doo",
        model: "MXZ",
      }),
    ).toBe("2021 Ski-Doo MXZ snowmobile owner's manual pdf");

    expect(
      buildManualSearchQuery({
        type: "motorcycle",
        year: 2020,
        make: "Harley-Davidson",
        model: "Sportster",
      }),
    ).toBe("2020 Harley-Davidson Sportster motorcycle owner's manual pdf");
  });
});
