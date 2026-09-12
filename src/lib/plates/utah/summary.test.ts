import { describe, expect, it } from "vitest";
import { formatMvpEntryCard } from "./summary";

describe("formatMvpEntryCard", () => {
  it("uses the specific design label when present", () => {
    const text = formatMvpEntryCard({
      plateTypeId: "standard_life_elevated",
      plateDesignLabel: "Life Elevated Skier",
      combos: ["REGI01"],
      meaning: "Family nickname",
    });

    expect(text).toContain("Plate type: Life Elevated Skier");
    expect(text).toContain("Choice 1: REGI01");
    expect(text).not.toContain("Skier or Arches");
  });
});
