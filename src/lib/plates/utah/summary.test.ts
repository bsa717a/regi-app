import { describe, expect, it } from "vitest";
import { estimateUtahPersonalizedPlateFees } from "./fees";
import { formatMvpEntryCard } from "./summary";

describe("formatMvpEntryCard", () => {
  it("uses the specific design label when present", () => {
    const text = formatMvpEntryCard({
      plateTypeId: "standard_life_elevated",
      plateDesignLabel: "Life Elevated Skier",
      combos: ["REGI01"],
      meaning: "Family nickname",
    });

    expect(text).toContain("Your order packet");
    expect(text).toContain("Plate type: Life Elevated Skier");
    expect(text).toContain("Choice 1: REGI01");
    expect(text).not.toContain("Skier or Arches");
    expect(text).toMatch(/does not send this to the DMV, prefill MVP, or skip payment/i);
    expect(text).toMatch(/Keep this packet available while you work in the other tab/i);
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

  it("includes three combos, VIN last 4, and the fee estimate when provided", () => {
    const fees = estimateUtahPersonalizedPlateFees();
    const text = formatMvpEntryCard(
      {
        plateTypeId: "standard_life_elevated",
        plateDesignId: "standard_life_elevated_arches",
        plateDesignLabel: "Life Elevated Arches",
        combos: ["REGI01", "REGI02", "REGI03"],
        meaning: "Family nickname",
        last4Vin: "2456",
      },
      fees,
    );

    expect(text).toContain("Choice 1: REGI01");
    expect(text).toContain("Choice 2: REGI02");
    expect(text).toContain("Choice 3: REGI03");
    expect(text).toContain("Meaning: Family nickname");
    expect(text).toContain("VIN last 4: 2456");
    expect(text).toContain("Estimated initial total: $75.00");
    expect(text).toContain("$50.00");
    expect(text).toContain("$25.00");
  });
});
