import { UTAH_PLATE_CATALOG_URL } from "./constants";
import { UTAH_SPECIAL_GROUP_DESIGNS } from "./specialGroupDesigns";
import type { UtahPlatePreview, UtahPlateType, UtahPlateTypeId } from "./types";

export type { UtahPlatePreview };

export type UtahPlateTypePickerOption = {
  optionId: string;
  plateTypeId: UtahPlateTypeId;
  label: string;
  description: string;
  maxCharacters: number;
  previews: UtahPlatePreview[];
  previewCaption?: string;
};

const CATALOG = "/plates/utah";

const ARCHES: UtahPlatePreview = {
  src: `${CATALOG}/life-elevated-arches.png`,
  alt: "Utah Life Elevated Arches license plate",
  width: 400,
  height: 199,
};

const SKIER: UtahPlatePreview = {
  src: `${CATALOG}/life-elevated-skier.png`,
  alt: "Utah Life Elevated Skier license plate",
  width: 400,
  height: 199,
};

const IN_GOD_WE_TRUST: UtahPlatePreview = {
  src: `${CATALOG}/in-god-we-trust.png`,
  alt: "Utah In God We Trust license plate",
  width: 400,
  height: 199,
};

const AMATEUR_RADIO: UtahPlatePreview = {
  src: `${CATALOG}/amateur-radio.png`,
  alt: "Utah amateur radio specialty license plate",
  width: 400,
  height: 200,
};

const SEARCH_RESCUE: UtahPlatePreview = {
  src: `${CATALOG}/search-rescue.png`,
  alt: "Utah Search and Rescue specialty license plate",
  width: 400,
  height: 200,
};

const DISABLED_PERSON: UtahPlatePreview = {
  src: `${CATALOG}/disabled-person.png`,
  alt: "Utah disabled person license plate",
  width: 400,
  height: 200,
};

export const UTAH_PLATE_PREVIEW_ATTRIBUTION = {
  catalogUrl: UTAH_PLATE_CATALOG_URL,
  note: "Plate images are official Utah DMV catalog art.",
};

function option(
  type: UtahPlateType,
  previews: UtahPlatePreview[],
  extras?: Partial<
    Pick<
      UtahPlateTypePickerOption,
      "optionId" | "label" | "description" | "previewCaption" | "maxCharacters"
    >
  >,
): UtahPlateTypePickerOption {
  return {
    optionId: extras?.optionId ?? type.id,
    plateTypeId: type.id,
    label: extras?.label ?? type.label,
    description: extras?.description ?? type.description,
    maxCharacters: extras?.maxCharacters ?? type.maxCharacters,
    previews,
    previewCaption: extras?.previewCaption,
  };
}

/**
 * Type-picker rows. Standard Life Elevated is split into Arches and Skier
 * so each design has its own clear preview. Both still use the same
 * `standard_life_elevated` limits and fees.
 */
export function utahPlateTypePickerOptions(
  types: readonly UtahPlateType[],
): UtahPlateTypePickerOption[] {
  const options: UtahPlateTypePickerOption[] = [];

  for (const type of types) {
    switch (type.id) {
      case "standard_life_elevated":
        options.push(
          option(type, [ARCHES], {
            optionId: "standard_life_elevated_arches",
            label: "Life Elevated Arches",
            description: "Standard issue. Up to 7 characters on the arches plate.",
          }),
          option(type, [SKIER], {
            optionId: "standard_life_elevated_skier",
            label: "Life Elevated Skier",
            description: "Standard issue. Up to 7 characters on the skier plate.",
          }),
        );
        break;
      case "in_god_we_trust":
        options.push(option(type, [IN_GOD_WE_TRUST]));
        break;
      case "special_group":
        for (const design of UTAH_SPECIAL_GROUP_DESIGNS) {
          options.push(
            option(type, [design.preview], {
              optionId: design.id,
              label: design.label,
              description: design.description,
              maxCharacters: design.maxCharacters,
            }),
          );
        }
        break;
      case "motorcycle_standard":
        options.push(
          option(type, [ARCHES, SKIER], {
            previewCaption:
              "Motorcycle plates use these Life Elevated designs (up to 5 characters).",
          }),
        );
        break;
      case "motorcycle_special_or_igwt":
        options.push(
          option(type, [IN_GOD_WE_TRUST, UTAH_SPECIAL_GROUP_DESIGNS[0]!.preview], {
            previewCaption:
              "Motorcycle specialty and In God We Trust plates use these catalog designs (up to 4 characters).",
          }),
        );
        break;
      case "radio":
        options.push(
          option(type, [AMATEUR_RADIO, SEARCH_RESCUE], {
            previewCaption: "Amateur radio and Search & Rescue radio plates.",
          }),
        );
        break;
      case "disabled_person":
        options.push(option(type, [DISABLED_PERSON]));
        break;
      default:
        break;
    }
  }

  return options;
}

export function defaultUtahPlatePickerOptionId(
  vehicleKind?: string | null,
): string {
  return vehicleKind === "motorcycle"
    ? "motorcycle_standard"
    : "standard_life_elevated_arches";
}

export function getUtahPlatePickerOption(
  options: readonly UtahPlateTypePickerOption[],
  optionId: string,
): UtahPlateTypePickerOption {
  return options.find((item) => item.optionId === optionId) ?? options[0]!;
}
