import type { Document, MemberRole, Renewal, Vehicle } from "@prisma/client";
import { serializeDocument } from "@/lib/documents/serialize";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import { serializeVehicle } from "@/lib/vehicles/serialize";
import { parseFeeBreakdown } from "./fees";
import {
  buildRequiredDocumentStatus,
  configNeedsCounty,
  countiesFromConfig,
} from "./requiredDocuments";
import type { RenewalDto } from "./types";

type RenewalWithRelations = Renewal & {
  vehicle: Vehicle;
  documents: Document[];
};

export function serializeRenewal(
  renewal: RenewalWithRelations,
  config: StateRulesConfig,
  householdRole: MemberRole = "owner",
): RenewalDto {
  const feeBreakdown = parseFeeBreakdown(renewal.feeBreakdown);
  const completeness = buildRequiredDocumentStatus(
    config,
    renewal.documents,
    feeBreakdown.county,
  );

  return {
    id: renewal.id,
    vehicleId: renewal.vehicleId,
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
    vehicle: serializeVehicle(renewal.vehicle, config, new Date(), householdRole),
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
