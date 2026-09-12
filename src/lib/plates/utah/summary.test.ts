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

  it("carries the special-group design name and id into MVP handoff text", () => {
    const text = formatMvpEntryCard({
      plateTypeId: "special_group",
      plateDesignId: "special_group_historic_bw",
      plateDesignLabel: "Historic B&W",
      combos: ["HISTOR1"],
      meaning: "Family nickname",
    });

    expect(text).toContain("Plate type: Historic B&W");
    expect(text).toContain("Design id: special_group_historic_bw");
    expect(text).toContain("Choice 1: HISTOR1");
    expect(text).not.toContain("Special group plate");
  });
});
