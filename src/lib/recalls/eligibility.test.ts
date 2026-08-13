import { describe, expect, it } from "vitest";
import { getRecallEligibility } from "./eligibility";

describe("getRecallEligibility", () => {
  it("allows passenger vehicles with year/make/model", () => {
    expect(
      getRecallEligibility({
        type: "passenger",
        year: 2020,
        make: "Honda",
        model: "Civic",
      }),
    ).toEqual({ eligible: true, reason: null });
  });

  it("rejects boats", () => {
    const result = getRecallEligibility({
      type: "boat",
      year: 2020,
      make: "Sea Ray",
      model: "SPX",
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("boats");
  });

  it("rejects OHV and snowmobile", () => {
    expect(
      getRecallEligibility({
        type: "ohv",
        year: 2022,
        make: "Polaris",
        model: "RZR",
      }).eligible,
    ).toBe(false);
    expect(
      getRecallEligibility({
        type: "snowmobile",
        year: 2022,
        make: "Ski-Doo",
        model: "MXZ",
      }).eligible,
    ).toBe(false);
  });

  it("rejects when year/make/model is missing", () => {
    expect(
      getRecallEligibility({
        type: "passenger",
        year: null,
        make: "Honda",
        model: "Civic",
      }).eligible,
    ).toBe(false);
    expect(
      getRecallEligibility({
        type: "motorhome",
        year: 2019,
        make: null,
        model: "Bounder",
      }).eligible,
    ).toBe(false);
    expect(
      getRecallEligibility({
        type: "trailer",
        year: 2019,
        make: "Big Tex",
        model: "  ",
      }).eligible,
    ).toBe(false);
  });

  it("allows trailer, motorcycle, and motorhome", () => {
    for (const type of ["trailer", "motorcycle", "motorhome"] as const) {
      expect(
        getRecallEligibility({
          type,
          year: 2018,
          make: "Make",
          model: "Model",
        }).eligible,
      ).toBe(true);
    }
  });
});
