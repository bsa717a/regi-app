export {
  UTAH_GET_TO_PAYMENT_STEPS,
  UTAH_MVP_ORDER_PLATES_URL,
  UTAH_MVP_PLATE_STATUS_URL,
  UTAH_MVP_URL,
  UTAH_NO_PREFILL_NOTE,
  UTAH_PACKET_STAYS_OPEN_NOTE,
  UTAH_PERSONALIZED_PLATES_INFO_URL,
  UTAH_PLATE_APPLICATION_FEE_CENTS,
  UTAH_PLATE_CATALOG_URL,
  UTAH_PLATE_FEE_DISCLAIMER,
  UTAH_PLATE_PROCESSING_FEE_CENTS,
  UTAH_PLATE_RENEWAL_FEE_CENTS,
  UTAH_PLATE_REQUIREMENTS,
} from "./constants";
export { utahVinLast4 } from "./vinLast4";
export { estimateUtahPersonalizedPlateFees } from "./fees";
export {
  getUtahPlateType,
  isUtahPlateTypeId,
  suggestedUtahPlateTypes,
  UTAH_PLATE_TYPES,
} from "./plateTypes";
export {
  defaultUtahPlatePickerOptionId,
  getUtahPlatePickerOption,
  utahPlateTypePickerOptions,
  UTAH_PLATE_PREVIEW_ATTRIBUTION,
} from "./previews";
export type {
  UtahPlatePickerGroup,
  UtahPlateTypePickerOption,
} from "./previews";
export {
  designsForPlateType,
  getUtahPlateDesign,
  getUtahSpecialGroupDesign,
  isUtahPlateDesignId,
  isUtahSpecialGroupDesignId,
  resolveUtahPlateMaxCharacters,
  UTAH_PLATE_DESIGNS,
  UTAH_SPECIAL_GROUP_DESIGNS,
} from "./plateDesigns";
export type {
  UtahPlateDesign,
  UtahSpecialGroupDesign,
} from "./plateDesigns";
export { formatFeeEstimateCopy } from "./feeCopy";
export { formatMvpEntryCard } from "./summary";
export type {
  PlateComboValidation,
  PlateSoftWarning,
  UtahPlateDraft,
  UtahPlateFeeEstimate,
  UtahPlatePreview,
  UtahPlateType,
  UtahPlateTypeId,
} from "./types";
export {
  collectSoftWarnings,
  normalizePlateCombo,
  plateComboCharacterCount,
  softContentWarnings,
  validatePlateCombo,
  validatePlateCombos,
  validatePlateMeaning,
} from "./validators";
