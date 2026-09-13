import type { RegistrationDto } from "@/lib/registrations/types";
import { buildRenewalStatusHistory, isTerminalRenewalSuccess } from "./history";
import type { FeeBreakdown, RenewalDto, RenewalTimestamps } from "./types";

const fees: FeeBreakdown = {
  currency: "USD",
  registrationFeeCents: 4400,
  regiServiceFeeCents: 2500,
  lateFeeCents: 0,
  totalCents: 6900,
  isEstimate: true,
  notes: "Estimate only — you will not be charged during MVP.",
};

const timestamps: RenewalTimestamps = {
  requestedAt: "2026-03-01T15:00:00.000Z",
  documentsReceivedAt: "2026-03-02T15:00:00.000Z",
  reviewingAt: "2026-03-03T15:00:00.000Z",
  processingAt: "2026-03-04T15:00:00.000Z",
  submittedAt: "2026-03-05T15:00:00.000Z",
  completedAt: "2026-03-06T15:00:00.000Z",
  stickerMailedAt: "2026-03-07T18:30:00.000Z",
};

function exampleRegistration(
  overrides: Partial<RegistrationDto> = {},
): RegistrationDto {
  return {
    id: "reg_tahoe",
    householdId: "hh_1",
    householdRole: "owner",
    canEdit: true,
    type: "passenger",
    vin: "1GNSKCKC8MR312456",
    plate: "REGI01",
    state: "UT",
    make: "Chevrolet",
    model: "Tahoe",
    year: 2021,
    nickname: "Mom's Tahoe",
    photoUrl: null,
    photos: [],
    bodyClass: "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
    details: {},
    registrationExpiresOn: "2027-03-31",
    createdBy: "user_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-03-07T18:30:00.000Z",
    status: "Current",
    daysUntilExpiration: 200,
    countdown: "200 days left",
    ...overrides,
  };
}

export function exampleRenewal(overrides: Partial<RenewalDto> = {}): RenewalDto {
  const status = overrides.status ?? "StickerMailed";
  const nextTimestamps = {
    ...timestamps,
    ...overrides.timestamps,
  };
  const base: RenewalDto = {
    id: "ren_proof_1",
    registrationId: "reg_tahoe",
    status,
    requestedBy: "user_1",
    feeBreakdown: fees,
    staffNotes: null,
    timestamps: nextTimestamps,
    statusHistory: buildRenewalStatusHistory(nextTimestamps),
    proofAvailable: isTerminalRenewalSuccess(status),
    createdAt: "2026-03-01T15:00:00.000Z",
    updatedAt: "2026-03-07T18:30:00.000Z",
    registration: exampleRegistration(),
    requiredDocuments: [],
    documents: [
      {
        id: "doc_reg_card",
        registrationId: "reg_tahoe",
        renewalId: "ren_proof_1",
        type: "registration",
        originalFilename: "registration-card.pdf",
        uploadedBy: "user_1",
        createdAt: "2026-03-02T15:00:00.000Z",
      },
    ],
    workflow: [],
    documentsComplete: true,
    missingDocumentTypes: [],
    paymentRequired: false,
    needsCounty: false,
    countyOptions: [],
  };
  return {
    ...base,
    ...overrides,
    status,
    timestamps: nextTimestamps,
    statusHistory:
      overrides.statusHistory ?? buildRenewalStatusHistory(nextTimestamps),
    proofAvailable:
      overrides.proofAvailable ?? isTerminalRenewalSuccess(status),
  };
}
