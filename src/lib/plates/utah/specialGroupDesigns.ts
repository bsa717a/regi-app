import { getUtahPlateType } from "./plateTypes";
import type { UtahPlatePreview, UtahPlateTypeId } from "./types";

/**
 * Individually selectable special-group designs.
 *
 * Add another official catalog plate by appending an entry here and placing
 * the PNG under `public/plates/utah/`. The type picker, character limits,
 * and MVP copy card pick this list up automatically — no picker redesign.
 */
export type UtahSpecialGroupDesign = {
  id: string;
  label: string;
  shortLabel: string;
  maxCharacters: number;
  description: string;
  preview: UtahPlatePreview;
};

const CATALOG = "/plates/utah";

export const UTAH_SPECIAL_GROUP_DESIGNS: readonly UtahSpecialGroupDesign[] = [
  {
    id: "special_group_wildlife_elk",
    label: "Wildlife Elk",
    shortLabel: "Wildlife Elk",
    maxCharacters: 5,
    description: "Special group. Up to 5 characters on the Wildlife Elk plate.",
    preview: {
      src: `${CATALOG}/special-group-wildlife-elk.png`,
      alt: "Utah Wildlife Elk special group license plate",
      width: 400,
      height: 200,
    },
  },
  {
    id: "special_group_utah_jazz",
    label: "Utah Jazz",
    shortLabel: "Utah Jazz",
    maxCharacters: 5,
    description: "Special group. Up to 5 characters on the Utah Jazz plate.",
    preview: {
      src: `${CATALOG}/special-group-utah-jazz.png`,
      alt: "Utah Jazz special group license plate",
      width: 400,
      height: 200,
    },
  },
  {
    id: "special_group_historic_bw",
    label: "Historic B&W",
    shortLabel: "Historic B&W",
    maxCharacters: 7,
    description:
      "Special group. Up to 7 characters on the Historic B&W (Historical Support) plate.",
    preview: {
      src: `${CATALOG}/special-group-historic-bw.png`,
      alt: "Utah Historic Black and White special group license plate",
      width: 400,
      height: 200,
    },
  },
];

export function getUtahSpecialGroupDesign(
  id: string,
): UtahSpecialGroupDesign | undefined {
  return UTAH_SPECIAL_GROUP_DESIGNS.find((design) => design.id === id);
}

export function isUtahSpecialGroupDesignId(id: string): boolean {
  return UTAH_SPECIAL_GROUP_DESIGNS.some((design) => design.id === id);
}

/**
 * Per-design limits when a catalog entry overrides the type default.
 * Historic B&W allows 7; other special-group designs in this catalog use 5.
 */
export function resolveUtahPlateMaxCharacters(
  plateTypeId: UtahPlateTypeId,
  plateDesignId?: string | null,
): number {
  if (plateDesignId) {
    const design = getUtahSpecialGroupDesign(plateDesignId);
    if (design) return design.maxCharacters;
  }
  return getUtahPlateType(plateTypeId).maxCharacters;
}
