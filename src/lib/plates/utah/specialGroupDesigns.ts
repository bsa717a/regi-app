/**
 * Compatibility surface from #69. Special-group designs now live in the
 * shared catalog (`plateDesigns.ts`) so motorcycle / radio / standard
 * cards follow the same append-only pattern.
 */
export {
  getUtahSpecialGroupDesign,
  isUtahSpecialGroupDesignId,
  resolveUtahPlateMaxCharacters,
  UTAH_SPECIAL_GROUP_DESIGNS,
} from "./plateDesigns";
export type { UtahSpecialGroupDesign } from "./plateDesigns";
