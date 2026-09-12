import { describe, expect, it } from "vitest";
import { UTAH_PLATE_TYPES } from "./plateTypes";
import {
  designsForPlateType,
  getUtahPlateDesign,
  getUtahSpecialGroupDesign,
  isUtahPlateDesignId,
  isUtahSpecialGroupDesignId,
  resolveUtahPlateMaxCharacters,
  UTAH_PLATE_DESIGNS,
  UTAH_SPECIAL_GROUP_DESIGNS,
} from "./plateDesigns";

describe("UTAH_PLATE_DESIGNS", () => {
  it("covers every plate type with unique catalog ids", () => {
    const ids = UTAH_PLATE_DESIGNS.map((design) => design.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const type of UTAH_PLATE_TYPES) {
      expect(
        designsForPlateType(type.id).length,
        type.id,
      ).toBeGreaterThan(0);
    }

    for (const design of UTAH_PLATE_DESIGNS) {
      expect(design.preview.src).toMatch(/^\/plates\/utah\//);
      expect(design.preview.alt.length).toBeGreaterThan(8);
      expect(design.maxCharacters).toBeGreaterThan(0);
    }
  });

  it("splits motorcycle and radio into individually selectable designs", () => {
    expect(
      designsForPlateType("motorcycle_standard").map((design) => design.id),
    ).toEqual([
      "motorcycle_life_elevated_arches",
      "motorcycle_life_elevated_skier",
    ]);
    expect(
      designsForPlateType("motorcycle_special_or_igwt").map(
        (design) => design.id,
      ),
    ).toEqual([
      "motorcycle_in_god_we_trust",
      "motorcycle_special_group_wildlife_elk",
    ]);
    expect(designsForPlateType("radio").map((design) => design.id)).toEqual([
      "radio_amateur",
      "radio_search_rescue",
    ]);
  });

  it("keeps the #69 special-group starter catalog as a filtered slice", () => {
    expect(UTAH_SPECIAL_GROUP_DESIGNS.map((design) => design.id)).toEqual([
      "special_group_wildlife_elk",
      "special_group_utah_jazz",
      "special_group_historic_bw",
    ]);
    expect(getUtahSpecialGroupDesign("special_group_historic_bw")?.maxCharacters).toBe(
      7,
    );
    expect(isUtahSpecialGroupDesignId("motorcycle_special_group_wildlife_elk")).toBe(
      false,
    );
    expect(isUtahPlateDesignId("motorcycle_special_group_wildlife_elk")).toBe(
      true,
    );
  });
});

describe("resolveUtahPlateMaxCharacters", () => {
  it("uses the selected catalog design when present", () => {
    expect(
      resolveUtahPlateMaxCharacters("special_group", "special_group_historic_bw"),
    ).toBe(7);
    expect(
      resolveUtahPlateMaxCharacters("special_group", "special_group_wildlife_elk"),
    ).toBe(5);
    expect(
      resolveUtahPlateMaxCharacters(
        "motorcycle_standard",
        "motorcycle_life_elevated_arches",
      ),
    ).toBe(5);
    expect(
      resolveUtahPlateMaxCharacters(
        "motorcycle_special_or_igwt",
        "motorcycle_in_god_we_trust",
      ),
    ).toBe(4);
    expect(
      resolveUtahPlateMaxCharacters(
        "motorcycle_special_or_igwt",
        "motorcycle_special_group_wildlife_elk",
      ),
    ).toBe(4);
    expect(resolveUtahPlateMaxCharacters("radio", "radio_amateur")).toBe(6);
    expect(resolveUtahPlateMaxCharacters("radio", "radio_search_rescue")).toBe(6);
    expect(resolveUtahPlateMaxCharacters("special_group")).toBe(5);
    expect(resolveUtahPlateMaxCharacters("motorcycle_standard")).toBe(5);
    expect(resolveUtahPlateMaxCharacters("motorcycle_special_or_igwt")).toBe(4);
    expect(resolveUtahPlateMaxCharacters("radio")).toBe(6);
    expect(getUtahPlateDesign("radio_amateur")?.plateTypeId).toBe("radio");
  });
});
