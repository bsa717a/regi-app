import type { DocumentType, RenewalStatus } from "@prisma/client";
import type {
  ConciergeWorkflowStep,
  RequiredDocumentRule,
  StateDocumentType,
} from "@/lib/stateEngine/types";
import type { DocumentDto } from "@/lib/documents/types";
import type { RegistrationDto } from "@/lib/registrations/types";

/** Fee amounts stored on renewals.fee_breakdown (cents). No Stripe charge. */
export type FeeBreakdown = {
  currency: "USD";
  registrationFeeCents: number;
  regiServiceFeeCents: number;
  lateFeeCents: number;
  totalCents: number;
  /** Always true in MVP — fees are informational only. */
  isEstimate: true;
  notes?: string;
  /** County used for emissions / county-scoped required docs. */
  county?: string | null;
};

export type RequiredDocumentStatus = {
  type: StateDocumentType;
  label: string;
  notes?: string;
  required: boolean;
  uploaded: boolean;
  documentIds: string[];
};

export type RenewalTimestamps = {
  requestedAt: string;
  documentsReceivedAt: string | null;
  reviewingAt: string | null;
  processingAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  stickerMailedAt: string | null;
};

export type RenewalDto = {
  id: string;
  registrationId: string;
  status: RenewalStatus;
  requestedBy: string;
  feeBreakdown: FeeBreakdown;
  staffNotes: string | null;
  timestamps: RenewalTimestamps;
  createdAt: string;
  updatedAt: string;
  registration: RegistrationDto;
  /** Docs currently applicable for this renewal (from state_rules.config). */
  requiredDocuments: RequiredDocumentStatus[];
  /** All documents linked to this renewal. */
  documents: DocumentDto[];
  /** Friendly progress steps from state_rules.config.conciergeWorkflow. */
  workflow: ConciergeWorkflowStep[];
  /** True when every required doc has at least one upload. */
  documentsComplete: boolean;
  /** Missing required document types (empty when complete). */
  missingDocumentTypes: StateDocumentType[];
  /** MVP: no payment step; estimate only. */
  paymentRequired: false;
  /** True when state_rules.config has county-scoped required docs. */
  needsCounty: boolean;
  /** Counties from config (for the emissions / county picker). */
  countyOptions: string[];
};

export type CreateRenewalInput = {
  registrationId: string;
  /** County for county-scoped required documents (e.g. Utah emissions). */
  county?: string | null;
};

export type DocumentTypeLike = DocumentType | StateDocumentType;

/** Rules as returned to clients (without full applicability internals when not needed). */
export type RequiredDocumentRuleDto = RequiredDocumentRule;
