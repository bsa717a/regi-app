import { UTAH_NO_PREFILL_NOTE, UTAH_PACKET_STAYS_OPEN_NOTE } from "./constants";
import { formatFeeEstimateCopy } from "./feeCopy";
import { getUtahPlateType } from "./plateTypes";
import type { UtahPlateDraft, UtahPlateFeeEstimate } from "./types";

export function formatMvpEntryCard(
  draft: UtahPlateDraft,
  fees?: UtahPlateFeeEstimate | null,
): string {
  const plateType = getUtahPlateType(draft.plateTypeId);
  const lines = [
    "Your order packet",
    "",
    `Plate type: ${draft.plateDesignLabel?.trim() || plateType.label}`,
    ...(draft.plateDesignId?.trim()
      ? [`Design id: ${draft.plateDesignId.trim()}`]
      : []),
    ...draft.combos.map((combo, index) => `Choice ${index + 1}: ${combo}`),
    `Meaning: ${draft.meaning.trim()}`,
  ];

  if (draft.vehicleLabel?.trim()) {
    lines.push(`Vehicle: ${draft.vehicleLabel.trim()}`);
  }
  if (draft.vehiclePlate?.trim()) {
    lines.push(`Current plate: ${draft.vehiclePlate.trim()}`);
  }
  if (draft.last4Vin?.trim()) {
    lines.push(`VIN last 4: ${draft.last4Vin.trim()}`);
  }

  if (fees) {
    lines.push("", formatFeeEstimateCopy(fees));
  }

  lines.push(
    "",
    "Vehicle must be currently registered in Utah.",
    UTAH_NO_PREFILL_NOTE,
    UTAH_PACKET_STAYS_OPEN_NOTE,
  );

  return lines.join("\n");
}
