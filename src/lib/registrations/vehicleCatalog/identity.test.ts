import { describe, expect, it } from "vitest";
import {
  cacheIdentity,
  filenameConflicts,
  modelKey,
} from "@/lib/registrations/vehicleCatalog/identity";

describe("vehicle identity keys", () => {
  it("drops trim words and make aliases", () => {
    expect(modelKey("F-150 XLT")).toBe("f150");
    expect(modelKey("R1T Adventure")).toBe("r1t");
    expect(cacheIdentity("Chevy", "Silverado")).toEqual({
      makeKey: "chevrolet",
      modelKey: "silverado",
    });
    expect(cacheIdentity("VW", "Touareg")).toEqual({
      makeKey: "volkswagen",
      modelKey: "touareg",
    });
  });

  it("treats a different manufacturer in the filename as a conflict", () => {
    expect(filenameConflicts("2021 Ford F-150 SuperCrew.jpg", "Ford")).toBe(false);
    expect(filenameConflicts("2019 Ram 1500 Laramie.jpg", "Ford")).toBe(true);
    expect(filenameConflicts("Tesla Model 3.jpg", "Honda")).toBe(true);
    expect(filenameConflicts("03-04 Honda Accord EX sedan.jpg", "Honda")).toBe(false);
    expect(filenameConflicts("Dodge Ram 1500.jpg", "Ram")).toBe(false);
  });
});
