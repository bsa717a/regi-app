import type { Document, MemberRole, Registration, Renewal } from "@prisma/client";
import { serializeDocument } from "@/lib/documents/serialize";
import { serializeRegistration } from "@/lib/registrations/serialize";
import { getRequiredDocumentsForType } from "@/lib/stateEngine/registrationTypes";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import { parseFeeBreakdown } from "./fees";
import {
  buildRequiredDocumentStatus,
  configNeedsCounty,
  countiesFromConfig,
} from "./requiredDocuments";
import type { RenewalDto } from "./types";

type RenewalWithRelations = Renewal & {
  registration: Registration;
  documents: Document[];
};

export function serializeRenewal(
  renewal: RenewalWithRelations,
  config: StateRulesConfig,
  householdRole: MemberRole = "owner",
): RenewalDto {
  const feeBreakdown = parseFeeBreakdown(renewal.feeBreakdown);
  const requiredDocuments = getRequiredDocumentsForType(
    config,
    renewal.registration.type,
  );
  const completeness = buildRequiredDocumentStatus(
    { ...config, requiredDocuments },
    renewal.documents,
    feeBreakdown.county,
  );

  return {
    id: renewal.id,
    registrationId: renewal.registrationId,
    status: renewal.status,
    requestedBy: renewal.requestedBy,
    feeBreakdown,
    staffNotes: renewal.staffNotes,
    timestamps: {
      requestedAt: renewal.requestedAt.toISOString(),
      documentsReceivedAt: renewal.documentsReceivedAt?.toISOString() ?? null,
      reviewingAt: renewal.reviewingAt?.toISOString() ?? null,
      processingAt: renewal.processingAt?.toISOString() ?? null,
      submittedAt: renewal.submittedAt?.toISOString() ?? null,
      completedAt: renewal.completedAt?.toISOString() ?? null,
      stickerMailedAt: renewal.stickerMailedAt?.toISOString() ?? null,
    },
    createdAt: renewal.createdAt.toISOString(),
    updatedAt: renewal.updatedAt.toISOString(),
    registration: serializeRegistration(
      renewal.registration,
      config,
      new Date(),
      householdRole,
    ),
    requiredDocuments: completeness.required,
    documents: renewal.documents.map(serializeDocument),
    workflow: [...config.conciergeWorkflow].sort((a, b) => a.order - b.order),
    documentsComplete: completeness.complete,
    missingDocumentTypes: completeness.missingTypes,
    paymentRequired: false,
    needsCounty: configNeedsCounty(config),
    countyOptions: countiesFromConfig(config),
  };
}
