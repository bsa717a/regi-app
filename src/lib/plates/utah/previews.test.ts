import { describe, expect, it } from "vitest";
import { UTAH_PLATE_TYPES } from "./plateTypes";
import {
  defaultUtahPlatePickerOptionId,
  getUtahPlatePickerOption,
  utahPlateTypePickerOptions,
} from "./previews";

describe("utahPlateTypePickerOptions", () => {
  const options = utahPlateTypePickerOptions(UTAH_PLATE_TYPES);

  it("splits standard Life Elevated into Arches and Skier with catalog images", () => {
    const arches = options.find(
      (option) => option.optionId === "standard_life_elevated_arches",
    );
    const skier = options.find(
      (option) => option.optionId === "standard_life_elevated_skier",
    );

    expect(arches?.plateTypeId).toBe("standard_life_elevated");
    expect(skier?.plateTypeId).toBe("standard_life_elevated");
    expect(arches?.previews[0]?.alt).toBe(
      "Utah Life Elevated Arches license plate",
    );
    expect(skier?.previews[0]?.alt).toBe(
      "Utah Life Elevated Skier license plate",
    );
    expect(arches?.previews[0]?.src).toContain("life-elevated-arches.png");
    expect(skier?.previews[0]?.src).toContain("life-elevated-skier.png");
  });

  it("gives every listed plate type at least one preview image", () => {
    for (const type of UTAH_PLATE_TYPES) {
      const matches = options.filter((option) => option.plateTypeId === type.id);
      expect(matches.length, type.id).toBeGreaterThan(0);
      expect(
        matches.every((option) => option.previews.length > 0),
        type.id,
      ).toBe(true);
    }
  });

  it("splits special group into individually selectable catalog designs", () => {
    const specials = options.filter(
      (option) => option.plateTypeId === "special_group",
    );
    expect(specials.map((option) => option.optionId)).toEqual([
      "special_group_wildlife_elk",
      "special_group_utah_jazz",
      "special_group_historic_bw",
    ]);
    expect(specials.every((option) => option.previews.length === 1)).toBe(true);
    expect(options.some((option) => option.optionId === "special_group")).toBe(
      false,
    );
    expect(
      specials.find((option) => option.optionId === "special_group_historic_bw")
        ?.maxCharacters,
    ).toBe(7);
    expect(
      specials.find((option) => option.optionId === "special_group_wildlife_elk")
        ?.maxCharacters,
    ).toBe(5);
  });

  it("splits motorcycle and radio buckets into one-preview cards", () => {
    const motoStandard = options.filter(
      (option) => option.plateTypeId === "motorcycle_standard",
    );
    const motoSpecialty = options.filter(
      (option) => option.plateTypeId === "motorcycle_special_or_igwt",
    );
    const radio = options.filter((option) => option.plateTypeId === "radio");

    expect(motoStandard.map((option) => option.optionId)).toEqual([
      "motorcycle_life_elevated_arches",
      "motorcycle_life_elevated_skier",
    ]);
    expect(motoSpecialty.map((option) => option.optionId)).toEqual([
      "motorcycle_in_god_we_trust",
      "motorcycle_special_group_wildlife_elk",
    ]);
    expect(radio.map((option) => option.optionId)).toEqual([
      "radio_amateur",
      "radio_search_rescue",
    ]);

    expect(
      [...motoStandard, ...motoSpecialty, ...radio].every(
        (option) => option.previews.length === 1,
      ),
    ).toBe(true);
    expect(options.some((option) => option.optionId === "motorcycle_standard")).toBe(
      false,
    );
    expect(
      options.some((option) => option.optionId === "motorcycle_special_or_igwt"),
    ).toBe(false);
    expect(options.some((option) => option.optionId === "radio")).toBe(false);
    expect(
      options.every((option) => option.previews.length === 1),
    ).toBe(true);
  });

  it("keeps motorcycle default on the motorcycle arches design", () => {
    expect(defaultUtahPlatePickerOptionId("motorcycle")).toBe(
      "motorcycle_life_elevated_arches",
    );
    expect(defaultUtahPlatePickerOptionId("passenger")).toBe(
      "standard_life_elevated_arches",
    );
    expect(
      getUtahPlatePickerOption(options, "in_god_we_trust").plateTypeId,
    ).toBe("in_god_we_trust");
    expect(
      getUtahPlatePickerOption(options, "motorcycle_in_god_we_trust")
        .maxCharacters,
    ).toBe(4);
    expect(
      getUtahPlatePickerOption(options, "radio_amateur").maxCharacters,
    ).toBe(6);
  });
});
