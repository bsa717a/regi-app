import type {
  Document,
  Renewal,
  RenewalStatus,
  User,
  Vehicle,
} from "@prisma/client";
import { serializeDocument } from "@/lib/documents/serialize";
import { parseFeeBreakdown } from "@/lib/renewals/fees";
import { RENEWAL_STATUS_ORDER } from "@/lib/renewals/status";
import type { FeeBreakdown } from "@/lib/renewals/types";

export type AdminDocumentWithUrl = ReturnType<typeof serializeDocument> & {
  downloadUrl: string | null;
  downloadExpiresAt: string | null;
};

export type AdminRenewalListItem = {
  id: string;
  status: RenewalStatus;
  requestedAt: string;
  updatedAt: string;
  feeBreakdown: FeeBreakdown;
  paymentStatus: "n/a (MVP)";
  vehicle: {
    id: string;
    plate: string | null;
    vin: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    nickname: string | null;
    state: string;
    registrationExpiresOn: string;
  };
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type AdminStatusHistoryEntry = {
  status: RenewalStatus;
  at: string | null;
};

export type AdminRenewalDetail = AdminRenewalListItem & {
  staffNotes: string | null;
  timestamps: {
    requestedAt: string;
    documentsReceivedAt: string | null;
    reviewingAt: string | null;
    processingAt: string | null;
    submittedAt: string | null;
    completedAt: string | null;
    stickerMailedAt: string | null;
  };
  statusHistory: AdminStatusHistoryEntry[];
  documents: AdminDocumentWithUrl[];
  nextStatus: RenewalStatus | null;
  refundAvailable: false;
  refundNote: "n/a (MVP)";
};

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildStatusHistory(renewal: Renewal): AdminStatusHistoryEntry[] {
  const map: Record<RenewalStatus, Date | null> = {
    Requested: renewal.requestedAt,
    DocumentsReceived: renewal.documentsReceivedAt,
    Reviewing: renewal.reviewingAt,
    Processing: renewal.processingAt,
    Submitted: renewal.submittedAt,
    Completed: renewal.completedAt,
    StickerMailed: renewal.stickerMailedAt,
  };

  return RENEWAL_STATUS_ORDER.map((status) => ({
    status,
    at: map[status]?.toISOString() ?? null,
  }));
}

export function nextStatusAfter(current: RenewalStatus): RenewalStatus | null {
  const idx = RENEWAL_STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= RENEWAL_STATUS_ORDER.length - 1) return null;
  return RENEWAL_STATUS_ORDER[idx + 1]!;
}

export function serializeAdminRenewalListItem(
  renewal: Renewal & {
    vehicle: Vehicle;
    requester: Pick<User, "id" | "email" | "name">;
  },
): AdminRenewalListItem {
  return {
    id: renewal.id,
    status: renewal.status,
    requestedAt: renewal.requestedAt.toISOString(),
    updatedAt: renewal.updatedAt.toISOString(),
    feeBreakdown: parseFeeBreakdown(renewal.feeBreakdown),
    paymentStatus: "n/a (MVP)",
    vehicle: {
      id: renewal.vehicle.id,
      plate: renewal.vehicle.plate,
      vin: renewal.vehicle.vin,
      year: renewal.vehicle.year,
      make: renewal.vehicle.make,
      model: renewal.vehicle.model,
      nickname: renewal.vehicle.nickname,
      state: renewal.vehicle.state,
      registrationExpiresOn: toDateOnly(renewal.vehicle.registrationExpiresOn),
    },
    owner: {
      id: renewal.requester.id,
      email: renewal.requester.email,
      name: renewal.requester.name,
    },
  };
}

export function serializeAdminRenewalDetail(
  renewal: Renewal & {
    vehicle: Vehicle;
    requester: Pick<User, "id" | "email" | "name">;
    documents: Document[];
  },
  documentsWithUrls: AdminDocumentWithUrl[],
): AdminRenewalDetail {
  const base = serializeAdminRenewalListItem(renewal);
  return {
    ...base,
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
    statusHistory: buildStatusHistory(renewal),
    documents: documentsWithUrls,
    nextStatus: nextStatusAfter(renewal.status),
    refundAvailable: false,
    refundNote: "n/a (MVP)",
  };
}

export { serializeDocument };
