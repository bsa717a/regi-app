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

  it("carries motorcycle and radio design name and id into MVP handoff text", () => {
    const moto = formatMvpEntryCard({
      plateTypeId: "motorcycle_standard",
      plateDesignId: "motorcycle_life_elevated_skier",
      plateDesignLabel: "Motorcycle Life Elevated Skier",
      combos: ["RIDE1"],
      meaning: "Family nickname",
    });
    expect(moto).toContain("Plate type: Motorcycle Life Elevated Skier");
    expect(moto).toContain("Design id: motorcycle_life_elevated_skier");
    expect(moto).toContain("Choice 1: RIDE1");

    const radio = formatMvpEntryCard({
      plateTypeId: "radio",
      plateDesignId: "radio_amateur",
      plateDesignLabel: "Amateur Radio",
      combos: ["K7ABC"],
      meaning: "Call sign",
    });
    expect(radio).toContain("Plate type: Amateur Radio");
    expect(radio).toContain("Design id: radio_amateur");
    expect(radio).not.toContain("Amateur / Search & Rescue radio");
  });
});
