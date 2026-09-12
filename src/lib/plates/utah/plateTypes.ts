import type { UtahPlateType, UtahPlateTypeId } from "./types";

/**
 * Character limits from Utah DMV personalized-plate guidance and form TC-817.
 * Special-group / IGWT motorcycle use the shorter motorcycle limits.
 */
export const UTAH_PLATE_TYPES: readonly UtahPlateType[] = [
  {
    id: "standard_life_elevated",
    label: "Standard Life Elevated (Skier or Arches)",
    shortLabel: "Standard Life Elevated",
    maxCharacters: 7,
    description: "Up to 7 characters on the skier or arches plate.",
    isSpecialGroup: false,
    typicalVehicleKinds: ["passenger", "trailer", "motorhome"],
  },
  {
    id: "in_god_we_trust",
    label: "In God We Trust",
    shortLabel: "In God We Trust",
    maxCharacters: 5,
    description: "Up to 5 characters on the In God We Trust plate.",
    isSpecialGroup: false,
    typicalVehicleKinds: ["passenger", "trailer", "motorhome"],
  },
  {
    id: "special_group",
    label: "Special group plate",
    shortLabel: "Special group",
    maxCharacters: 5,
    description:
      "Most special group plates allow up to 5 characters. A few designs (such as B&W Historical Support) may allow more — confirm on MVP.",
    isSpecialGroup: true,
    typicalVehicleKinds: ["any"],
  },
  {
    id: "motorcycle_standard",
    label: "Motorcycle (Life Elevated)",
    shortLabel: "Motorcycle standard",
    maxCharacters: 5,
    description: "Up to 5 characters on a standard motorcycle plate.",
    isSpecialGroup: false,
    typicalVehicleKinds: ["motorcycle"],
  },
  {
    id: "motorcycle_special_or_igwt",
    label: "Motorcycle special group or In God We Trust",
    shortLabel: "Motorcycle specialty",
    maxCharacters: 4,
    description:
      "Up to 4 characters on motorcycle special group or In God We Trust plates.",
    isSpecialGroup: true,
    typicalVehicleKinds: ["motorcycle"],
  },
  {
    id: "radio",
    label: "Amateur / Search & Rescue radio",
    shortLabel: "Radio",
    maxCharacters: 6,
    description: "Up to 6 characters. Requires a valid radio call sign.",
    isSpecialGroup: false,
    typicalVehicleKinds: ["any"],
  },
  {
    id: "disabled_person",
    label: "Disabled person",
    shortLabel: "Disabled person",
    maxCharacters: 5,
    description:
      "Up to 5 characters (4 on a motorcycle). Eligibility is determined by the DMV.",
    isSpecialGroup: false,
    typicalVehicleKinds: ["any"],
  },
];

export function getUtahPlateType(id: UtahPlateTypeId): UtahPlateType {
  const found = UTAH_PLATE_TYPES.find((type) => type.id === id);
  if (!found) {
    throw new Error(`Unknown Utah plate type: ${id}`);
  }
  return found;
}

export function isUtahPlateTypeId(value: string): value is UtahPlateTypeId {
  return UTAH_PLATE_TYPES.some((type) => type.id === value);
}

export function suggestedUtahPlateTypes(
  vehicleKind?: string | null,
): UtahPlateType[] {
  if (vehicleKind === "motorcycle") {
    return [...UTAH_PLATE_TYPES].sort((a, b) => {
      const aScore = a.typicalVehicleKinds.includes("motorcycle") ? 0 : 1;
      const bScore = b.typicalVehicleKinds.includes("motorcycle") ? 0 : 1;
      return aScore - bScore;
    });
  }
  return [...UTAH_PLATE_TYPES];
}
