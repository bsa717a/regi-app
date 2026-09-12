import { getUtahPlateType } from "./plateTypes";
import type { UtahPlatePreview, UtahPlateTypeId } from "./types";

/**
 * Individually selectable catalog designs.
 *
 * Add another official catalog plate by appending an entry here and placing
 * the PNG under `public/plates/utah/`. The type picker, character limits,
 * and MVP copy card pick this list up automatically — no picker special-case.
 */
export type UtahPlateDesign = {
  id: string;
  plateTypeId: UtahPlateTypeId;
  label: string;
  shortLabel: string;
  maxCharacters: number;
  description: string;
  preview: UtahPlatePreview;
};

const CATALOG = "/plates/utah";

export const LIFE_ELEVATED_ARCHES: UtahPlatePreview = {
  src: `${CATALOG}/life-elevated-arches.png`,
  alt: "Utah Life Elevated Arches license plate",
  width: 400,
  height: 199,
};

export const LIFE_ELEVATED_SKIER: UtahPlatePreview = {
  src: `${CATALOG}/life-elevated-skier.png`,
  alt: "Utah Life Elevated Skier license plate",
  width: 400,
  height: 199,
};

export const IN_GOD_WE_TRUST: UtahPlatePreview = {
  src: `${CATALOG}/in-god-we-trust.png`,
  alt: "Utah In God We Trust license plate",
  width: 400,
  height: 199,
};

export const AMATEUR_RADIO: UtahPlatePreview = {
  src: `${CATALOG}/amateur-radio.png`,
  alt: "Utah amateur radio specialty license plate",
  width: 400,
  height: 200,
};

export const SEARCH_RESCUE: UtahPlatePreview = {
  src: `${CATALOG}/search-rescue.png`,
  alt: "Utah Search and Rescue specialty license plate",
  width: 400,
  height: 200,
};

export const DISABLED_PERSON: UtahPlatePreview = {
  src: `${CATALOG}/disabled-person.png`,
  alt: "Utah disabled person license plate",
  width: 400,
  height: 200,
};

export const WILDLIFE_ELK: UtahPlatePreview = {
  src: `${CATALOG}/special-group-wildlife-elk.png`,
  alt: "Utah Wildlife Elk special group license plate",
  width: 400,
  height: 200,
};

export const UTAH_JAZZ: UtahPlatePreview = {
  src: `${CATALOG}/special-group-utah-jazz.png`,
  alt: "Utah Jazz special group license plate",
  width: 400,
  height: 200,
};

export const HISTORIC_BW: UtahPlatePreview = {
  src: `${CATALOG}/special-group-historic-bw.png`,
  alt: "Utah Historic Black and White special group license plate",
  width: 400,
  height: 200,
};

/**
 * Source of truth for selectable plate cards. Fees and `isSpecialGroup`
 * still come from `plateTypeId`; only the design id / preview / character
 * limit live here.
 */
export const UTAH_PLATE_DESIGNS: readonly UtahPlateDesign[] = [
  {
    id: "standard_life_elevated_arches",
    plateTypeId: "standard_life_elevated",
    label: "Life Elevated Arches",
    shortLabel: "Life Elevated Arches",
    maxCharacters: 7,
    description: "Standard issue. Up to 7 characters on the arches plate.",
    preview: LIFE_ELEVATED_ARCHES,
  },
  {
    id: "standard_life_elevated_skier",
    plateTypeId: "standard_life_elevated",
    label: "Life Elevated Skier",
    shortLabel: "Life Elevated Skier",
    maxCharacters: 7,
    description: "Standard issue. Up to 7 characters on the skier plate.",
    preview: LIFE_ELEVATED_SKIER,
  },
  {
    id: "in_god_we_trust",
    plateTypeId: "in_god_we_trust",
    label: "In God We Trust",
    shortLabel: "In God We Trust",
    maxCharacters: 5,
    description: "Up to 5 characters on the In God We Trust plate.",
    preview: IN_GOD_WE_TRUST,
  },
  {
    id: "special_group_wildlife_elk",
    plateTypeId: "special_group",
    label: "Wildlife Elk",
    shortLabel: "Wildlife Elk",
    maxCharacters: 5,
    description: "Special group. Up to 5 characters on the Wildlife Elk plate.",
    preview: WILDLIFE_ELK,
  },
  {
    id: "special_group_utah_jazz",
    plateTypeId: "special_group",
    label: "Utah Jazz",
    shortLabel: "Utah Jazz",
    maxCharacters: 5,
    description: "Special group. Up to 5 characters on the Utah Jazz plate.",
    preview: UTAH_JAZZ,
  },
  {
    id: "special_group_historic_bw",
    plateTypeId: "special_group",
    label: "Historic B&W",
    shortLabel: "Historic B&W",
    maxCharacters: 7,
    description:
      "Special group. Up to 7 characters on the Historic B&W (Historical Support) plate.",
    preview: HISTORIC_BW,
  },
  {
    id: "motorcycle_life_elevated_arches",
    plateTypeId: "motorcycle_standard",
    label: "Motorcycle Life Elevated Arches",
    shortLabel: "Motorcycle Arches",
    maxCharacters: 5,
    description:
      "Motorcycle standard. Up to 5 characters on the arches plate.",
    preview: LIFE_ELEVATED_ARCHES,
  },
  {
    id: "motorcycle_life_elevated_skier",
    plateTypeId: "motorcycle_standard",
    label: "Motorcycle Life Elevated Skier",
    shortLabel: "Motorcycle Skier",
    maxCharacters: 5,
    description:
      "Motorcycle standard. Up to 5 characters on the skier plate.",
    preview: LIFE_ELEVATED_SKIER,
  },
  {
    id: "motorcycle_in_god_we_trust",
    plateTypeId: "motorcycle_special_or_igwt",
    label: "Motorcycle In God We Trust",
    shortLabel: "Motorcycle IGWT",
    maxCharacters: 4,
    description:
      "Motorcycle specialty. Up to 4 characters on the In God We Trust plate.",
    preview: IN_GOD_WE_TRUST,
  },
  {
    id: "motorcycle_special_group_wildlife_elk",
    plateTypeId: "motorcycle_special_or_igwt",
    label: "Motorcycle Wildlife Elk",
    shortLabel: "Motorcycle Wildlife Elk",
    maxCharacters: 4,
    description:
      "Motorcycle specialty. Up to 4 characters on the Wildlife Elk plate.",
    preview: WILDLIFE_ELK,
  },
  {
    id: "radio_amateur",
    plateTypeId: "radio",
    label: "Amateur Radio",
    shortLabel: "Amateur Radio",
    maxCharacters: 6,
    description:
      "Radio plate. Up to 6 characters. Requires a valid amateur radio call sign.",
    preview: AMATEUR_RADIO,
  },
  {
    id: "radio_search_rescue",
    plateTypeId: "radio",
    label: "Search & Rescue",
    shortLabel: "Search & Rescue",
    maxCharacters: 6,
    description:
      "Radio plate. Up to 6 characters. Requires a valid Search & Rescue radio call sign.",
    preview: SEARCH_RESCUE,
  },
  {
    id: "disabled_person",
    plateTypeId: "disabled_person",
    label: "Disabled person",
    shortLabel: "Disabled person",
    maxCharacters: 5,
    description:
      "Up to 5 characters (4 on a motorcycle). Eligibility is determined by the DMV.",
    preview: DISABLED_PERSON,
  },
];

export function getUtahPlateDesign(
  id: string,
): UtahPlateDesign | undefined {
  return UTAH_PLATE_DESIGNS.find((design) => design.id === id);
}

export function isUtahPlateDesignId(id: string): boolean {
  return UTAH_PLATE_DESIGNS.some((design) => design.id === id);
}

export function designsForPlateType(
  plateTypeId: UtahPlateTypeId,
): readonly UtahPlateDesign[] {
  return UTAH_PLATE_DESIGNS.filter((design) => design.plateTypeId === plateTypeId);
}

export const UTAH_SPECIAL_GROUP_DESIGNS: readonly UtahPlateDesign[] =
  designsForPlateType("special_group");

export type UtahSpecialGroupDesign = UtahPlateDesign;

export function getUtahSpecialGroupDesign(
  id: string,
): UtahPlateDesign | undefined {
  const design = getUtahPlateDesign(id);
  return design?.plateTypeId === "special_group" ? design : undefined;
}

export function isUtahSpecialGroupDesignId(id: string): boolean {
  return getUtahSpecialGroupDesign(id) !== undefined;
}

/**
 * Per-design limits when a catalog entry overrides the type default.
 * Historic B&W allows 7; motorcycle specialty stays 4 unless a design
 * overrides; radio stays 6; motorcycle standard stays 5.
 */
export function resolveUtahPlateMaxCharacters(
  plateTypeId: UtahPlateTypeId,
  plateDesignId?: string | null,
): number {
  if (plateDesignId) {
    const design = getUtahPlateDesign(plateDesignId);
    if (design) return design.maxCharacters;
  }
  return getUtahPlateType(plateTypeId).maxCharacters;
}
