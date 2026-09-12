export type UtahPlateTypeId =
  | "standard_life_elevated"
  | "in_god_we_trust"
  | "special_group"
  | "motorcycle_standard"
  | "motorcycle_special_or_igwt"
  | "radio"
  | "disabled_person";

export type UtahPlateType = {
  id: UtahPlateTypeId;
  label: string;
  shortLabel: string;
  maxCharacters: number;
  description: string;
  isSpecialGroup: boolean;
  typicalVehicleKinds: Array<
    "passenger" | "motorcycle" | "trailer" | "motorhome" | "any"
  >;
};

export type UtahPlatePreview = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type PlateComboValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

export type PlateSoftWarning = {
  id: string;
  message: string;
};

export type UtahPlateFeeEstimate = {
  currency: "USD";
  applicationFeeCents: number;
  processingFeeCents: number;
  initialTotalCents: number;
  renewalFeeCents: number;
  isEstimate: true;
  specialGroupNote: string | null;
  disclaimer: string;
};

export type UtahPlateDraft = {
  plateTypeId: UtahPlateTypeId;
  /** Catalog design id when the customer picked a specific plate, not a type bucket. */
  plateDesignId?: string | null;
  /** Specific design name when a type has more than one catalog preview. */
  plateDesignLabel?: string | null;
  combos: string[];
  meaning: string;
  vehicleLabel?: string | null;
  vehiclePlate?: string | null;
};
