import type { DocumentType, RenewalStatus } from "@prisma/client";
import { inferPreviewKind } from "@/lib/documents/previewKind";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import { formatUsdCents } from "./formatMoney";
import { buildRenewalStatusHistory, isTerminalRenewalSuccess } from "./history";
import { renewalStatusLabel, renewalVehicleLabel } from "./labels";
import type {
  FeeBreakdown,
  RenewalStatusHistoryEntry,
  RenewalTimestamps,
} from "./types";

export const RENEWAL_PROOF_PAYMENT_NOTE =
  "Confirmation only — REGI has not charged a card. Fee amounts are an informational estimate, not a payment receipt.";

export type RenewalProofDocument = {
  id: string;
  type: DocumentType;
  typeLabel: string;
  filename: string;
  isPdf: boolean;
};

export type RenewalProof = {
  available: boolean;
  confirmationNumber: string;
  vehicleLabel: string;
  plate: string | null;
  vin: string | null;
  state: string;
  status: RenewalStatus;
  statusLabel: string;
  requestedAt: string;
  completedAt: string | null;
  stickerMailedAt: string | null;
  feeBreakdown: FeeBreakdown;
  paymentCharged: false;
  paymentNote: string;
  documents: RenewalProofDocument[];
  history: RenewalStatusHistoryEntry[];
};

export type RenewalProofSource = {
  id: string;
  status: RenewalStatus;
  timestamps: RenewalTimestamps;
  feeBreakdown: FeeBreakdown;
  documents: Array<{
    id: string;
    type: DocumentType;
    originalFilename: string;
  }>;
  registration: {
    nickname: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    plate: string | null;
    vin: string | null;
    state: string;
  };
};

export function buildRenewalProof(source: RenewalProofSource): RenewalProof {
  return {
    available: isTerminalRenewalSuccess(source.status),
    confirmationNumber: source.id,
    vehicleLabel: renewalVehicleLabel(source.registration),
    plate: source.registration.plate,
    vin: source.registration.vin,
    state: source.registration.state,
    status: source.status,
    statusLabel: renewalStatusLabel(source.status),
    requestedAt: source.timestamps.requestedAt,
    completedAt: source.timestamps.completedAt,
    stickerMailedAt: source.timestamps.stickerMailedAt,
    feeBreakdown: source.feeBreakdown,
    paymentCharged: false,
    paymentNote: RENEWAL_PROOF_PAYMENT_NOTE,
    documents: source.documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      typeLabel: DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type,
      filename: doc.originalFilename,
      isPdf: inferPreviewKind({ filename: doc.originalFilename }) === "pdf",
    })),
    history: buildRenewalStatusHistory(source.timestamps),
  };
}

export function renewalReceiptFilename(proof: RenewalProof): string {
  const slug = proof.vehicleLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `regi-renewal-confirmation-${slug || "vehicle"}.txt`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Plain-text confirmation the user can save. Not a payment receipt. */
export function buildRenewalReceiptText(proof: RenewalProof): string {
  const lines = [
    "REGI renewal confirmation",
    "=========================",
    "",
    proof.available
      ? "Status: Sticker mailed — this is your in-app proof."
      : "Status: Proof is available after the sticker is mailed.",
    "",
    `Confirmation: ${proof.confirmationNumber}`,
    `Vehicle: ${proof.vehicleLabel}`,
    proof.plate ? `Plate: ${proof.plate}` : null,
    proof.vin ? `VIN: ${proof.vin}` : null,
    `State: ${proof.state}`,
    `Current status: ${proof.statusLabel}`,
    `Requested: ${formatWhen(proof.requestedAt)}`,
    `Completed: ${formatWhen(proof.completedAt)}`,
    `Sticker mailed: ${formatWhen(proof.stickerMailedAt)}`,
    "",
    "Fee estimate (not charged)",
    `  Registration: ${formatUsdCents(proof.feeBreakdown.registrationFeeCents)}`,
    `  REGI service: ${formatUsdCents(proof.feeBreakdown.regiServiceFeeCents)}`,
    `  Late fee: ${formatUsdCents(proof.feeBreakdown.lateFeeCents)}`,
    `  Estimated total: ${formatUsdCents(proof.feeBreakdown.totalCents)}`,
    "",
    proof.paymentNote,
    "",
    "Status history",
    ...proof.history.map(
      (entry) => `  ${entry.label}: ${formatWhen(entry.at)}`,
    ),
  ];

  if (proof.documents.length > 0) {
    lines.push("", "Uploaded documents");
    for (const doc of proof.documents) {
      lines.push(
        `  ${doc.typeLabel}: ${doc.filename}${doc.isPdf ? " (PDF)" : ""}`,
      );
    }
  }

  lines.push("");
  return lines.filter((line) => line !== null).join("\n");
}

export function buildRenewalReceiptHtml(proof: RenewalProof): string {
  const escaped = buildRenewalReceiptText(proof)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>REGI renewal confirmation — ${escapeHtml(proof.vehicleLabel)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; white-space: pre-wrap; padding: 24px; color: #0f172a; }
  </style>
</head>
<body>${escaped}</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
