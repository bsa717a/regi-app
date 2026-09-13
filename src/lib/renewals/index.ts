export type {
  CreateRenewalInput,
  FeeBreakdown,
  RequiredDocumentStatus,
  RenewalDto,
  RenewalStatusHistoryEntry,
  RenewalTimestamps,
} from "./types";

export {
  buildRenewalStatusHistory,
  isTerminalRenewalSuccess,
  TERMINAL_RENEWAL_SUCCESS_STATUSES,
  timestampsFromRenewalDates,
  type TerminalRenewalSuccessStatus,
} from "./history";

export {
  buildRenewalProof,
  buildRenewalReceiptHtml,
  buildRenewalReceiptText,
  RENEWAL_PROOF_PAYMENT_NOTE,
  renewalReceiptFilename,
  type RenewalProof,
  type RenewalProofDocument,
  type RenewalProofSource,
} from "./proof";

export { renewalStatusLabel, renewalVehicleLabel } from "./labels";

export { computeFeeBreakdown, parseFeeBreakdown } from "./fees";

export {
  buildRequiredDocumentStatus,
  checkRequiredDocumentsComplete,
  configNeedsCounty,
  countiesFromConfig,
  documentApplies,
  getApplicableRequiredDocuments,
} from "./requiredDocuments";

export {
  mergeDocumentsForRenewal,
  vaultDocumentsToAttach,
} from "./vaultDocs";

export {
  advanceRenewalStatus,
  isValidStatusTransition,
  RENEWAL_STATUS_ORDER,
  statusIndex,
  type AdvanceRenewalStatusDeps,
  type AdvanceRenewalStatusResult,
  type RenewalStatusActor,
} from "./status";

export {
  canStartRenewal,
  OPEN_RENEWAL_STATUSES,
} from "./eligibility";

export { serializeRenewal } from "./serialize";

export {
  loadAccessibleRenewal,
  loadEditableRenewal,
} from "./ownership";

export { isEmailVerified, parseCreateRenewalBody } from "./validation";
