import { describe, expect, it } from "vitest";
import {
  getUtahSpecialGroupDesign,
  isUtahSpecialGroupDesignId,
  resolveUtahPlateMaxCharacters,
  UTAH_SPECIAL_GROUP_DESIGNS,
} from "./specialGroupDesigns";

describe("UTAH_SPECIAL_GROUP_DESIGNS", () => {
  it("starts with the three catalog designs Derek can pick", () => {
    expect(UTAH_SPECIAL_GROUP_DESIGNS.map((design) => design.id)).toEqual([
      "special_group_wildlife_elk",
      "special_group_utah_jazz",
      "special_group_historic_bw",
    ]);
    expect(UTAH_SPECIAL_GROUP_DESIGNS.map((design) => design.label)).toEqual([
      "Wildlife Elk",
      "Utah Jazz",
      "Historic B&W",
    ]);
  });

  it("keeps unique ids so more catalog entries can be appended later", () => {
    const ids = UTAH_SPECIAL_GROUP_DESIGNS.map((design) => design.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const design of UTAH_SPECIAL_GROUP_DESIGNS) {
      expect(design.preview.src).toMatch(/^\/plates\/utah\//);
      expect(design.preview.alt.length).toBeGreaterThan(8);
    }
  });

  it("uses 7 characters for Historic B&W and 5 for the other starter designs", () => {
    expect(getUtahSpecialGroupDesign("special_group_historic_bw")?.maxCharacters).toBe(
      7,
    );
    expect(getUtahSpecialGroupDesign("special_group_wildlife_elk")?.maxCharacters).toBe(
      5,
    );
    expect(getUtahSpecialGroupDesign("special_group_utah_jazz")?.maxCharacters).toBe(
      5,
    );
    expect(isUtahSpecialGroupDesignId("special_group")).toBe(false);
  });
});

describe("resolveUtahPlateMaxCharacters", () => {
  it("prefers the selected special-group design over the type default", () => {
    expect(
      resolveUtahPlateMaxCharacters("special_group", "special_group_historic_bw"),
    ).toBe(7);
    expect(
      resolveUtahPlateMaxCharacters("special_group", "special_group_wildlife_elk"),
    ).toBe(5);
    expect(resolveUtahPlateMaxCharacters("special_group")).toBe(5);
    expect(resolveUtahPlateMaxCharacters("standard_life_elevated")).toBe(7);
  });
});
