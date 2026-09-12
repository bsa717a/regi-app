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

  it("keeps motorcycle default on the motorcycle standard option", () => {
    expect(defaultUtahPlatePickerOptionId("motorcycle")).toBe(
      "motorcycle_standard",
    );
    expect(defaultUtahPlatePickerOptionId("passenger")).toBe(
      "standard_life_elevated_arches",
    );
    expect(
      getUtahPlatePickerOption(options, "in_god_we_trust").plateTypeId,
    ).toBe("in_god_we_trust");
  });
});
