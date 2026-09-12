import { UTAH_NO_PREFILL_NOTE } from "./constants";
import { getUtahPlateType } from "./plateTypes";
import type { UtahPlateDraft } from "./types";

export function formatMvpEntryCard(draft: UtahPlateDraft): string {
  const plateType = getUtahPlateType(draft.plateTypeId);
  const lines = [
    "Enter this in Utah MVP",
    "",
    `Plate type: ${draft.plateDesignLabel?.trim() || plateType.label}`,
    ...(draft.plateDesignId?.trim()
      ? [`Design id: ${draft.plateDesignId.trim()}`]
      : []),
    ...draft.combos.map(
      (combo, index) => `Choice ${index + 1}: ${combo}`,
    ),
    `Meaning: ${draft.meaning.trim()}`,
  ];

  if (draft.vehicleLabel?.trim()) {
    lines.push(`Vehicle: ${draft.vehicleLabel.trim()}`);
  }
  if (draft.vehiclePlate?.trim()) {
    lines.push(`Current plate: ${draft.vehiclePlate.trim()}`);
  }

  lines.push(
    "",
    "Vehicle must be currently registered in Utah.",
    UTAH_NO_PREFILL_NOTE,
  );

  return lines.join("\n");
}
