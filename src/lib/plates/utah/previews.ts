import { UTAH_PLATE_CATALOG_URL } from "./constants";
import { designsForPlateType } from "./plateDesigns";
import type { UtahPlatePreview, UtahPlateType, UtahPlateTypeId } from "./types";

export type { UtahPlatePreview };

export type UtahPlatePickerGroup = {
  id: string;
  heading: string;
  footer?: string;
};

export type UtahPlateTypePickerOption = {
  optionId: string;
  plateTypeId: UtahPlateTypeId;
  label: string;
  description: string;
  maxCharacters: number;
  previews: UtahPlatePreview[];
  previewCaption?: string;
  pickerGroup?: UtahPlatePickerGroup;
};

export const UTAH_PLATE_PREVIEW_ATTRIBUTION = {
  catalogUrl: UTAH_PLATE_CATALOG_URL,
  note: "Plate images are official Utah DMV catalog art.",
};

const PICKER_GROUPS: Partial<
  Record<UtahPlateTypeId, Omit<UtahPlatePickerGroup, "id">>
> = {
  special_group: {
    heading: "Special group designs",
    footer:
      "More special group designs can be added from the Utah DMV catalog.",
  },
  motorcycle_standard: {
    heading: "Motorcycle Life Elevated",
  },
  motorcycle_special_or_igwt: {
    heading: "Motorcycle specialty",
  },
  radio: {
    heading: "Radio plates",
  },
};

/**
 * Type-picker rows. Every catalog design is its own radio card.
 * Adding a design is catalog + PNG — this builder does not grow
 * per-bucket special cases.
 */
export function utahPlateTypePickerOptions(
  types: readonly UtahPlateType[],
): UtahPlateTypePickerOption[] {
  const options: UtahPlateTypePickerOption[] = [];

  for (const type of types) {
    const designs = designsForPlateType(type.id);
    const groupMeta = designs.length > 1 ? PICKER_GROUPS[type.id] : undefined;
    const pickerGroup = groupMeta
      ? { id: type.id, ...groupMeta }
      : undefined;

    for (const design of designs) {
      options.push({
        optionId: design.id,
        plateTypeId: design.plateTypeId,
        label: design.label,
        description: design.description,
        maxCharacters: design.maxCharacters,
        previews: [design.preview],
        pickerGroup,
      });
    }
  }

  return options;
}

export function defaultUtahPlatePickerOptionId(
  vehicleKind?: string | null,
): string {
  return vehicleKind === "motorcycle"
    ? "motorcycle_life_elevated_arches"
    : "standard_life_elevated_arches";
}

export function getUtahPlatePickerOption(
  options: readonly UtahPlateTypePickerOption[],
  optionId: string,
): UtahPlateTypePickerOption {
  return options.find((item) => item.optionId === optionId) ?? options[0]!;
}
