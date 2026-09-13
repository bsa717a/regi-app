import { describe, expect, it } from "vitest";
import {
  buildRenewalProof,
  buildRenewalReceiptHtml,
  buildRenewalReceiptText,
  RENEWAL_PROOF_PAYMENT_NOTE,
  renewalReceiptFilename,
  type RenewalProofSource,
} from "./proof";
import type { FeeBreakdown } from "./types";

const fees: FeeBreakdown = {
  currency: "USD",
  registrationFeeCents: 4400,
  regiServiceFeeCents: 2500,
  lateFeeCents: 0,
  totalCents: 6900,
  isEstimate: true,
};

function source(
  overrides: Partial<RenewalProofSource> = {},
): RenewalProofSource {
  return {
    id: "ren_proof_1",
    status: "StickerMailed",
    timestamps: {
      requestedAt: "2026-03-01T15:00:00.000Z",
      documentsReceivedAt: "2026-03-02T15:00:00.000Z",
      reviewingAt: "2026-03-03T15:00:00.000Z",
      processingAt: "2026-03-04T15:00:00.000Z",
      submittedAt: "2026-03-05T15:00:00.000Z",
      completedAt: "2026-03-06T15:00:00.000Z",
      stickerMailedAt: "2026-03-07T15:00:00.000Z",
    },
    feeBreakdown: fees,
    documents: [
      {
        id: "doc_1",
        type: "registration",
        originalFilename: "registration-card.pdf",
      },
    ],
    registration: {
      nickname: "Mom's Tahoe",
      year: 2021,
      make: "Chevrolet",
      model: "Tahoe",
      plate: "REGI01",
      vin: "1GNSKCKC8MR312456",
      state: "UT",
    },
    ...overrides,
  };
}

describe("buildRenewalProof", () => {
  it("builds confirmation + mailed-sticker proof from existing renewal fields", () => {
    const proof = buildRenewalProof(source());
    expect(proof.available).toBe(true);
    expect(proof.paymentCharged).toBe(false);
    expect(proof.confirmationNumber).toBe("ren_proof_1");
    expect(proof.vehicleLabel).toBe("Mom's Tahoe");
    expect(proof.statusLabel).toBe("Sticker Mailed");
    expect(proof.stickerMailedAt).toBe("2026-03-07T15:00:00.000Z");
    expect(proof.paymentNote).toBe(RENEWAL_PROOF_PAYMENT_NOTE);
    expect(proof.documents).toEqual([
      {
        id: "doc_1",
        type: "registration",
        typeLabel: "Registration",
        filename: "registration-card.pdf",
        isPdf: true,
      },
    ]);
    expect(proof.history).toHaveLength(7);
  });

  it("does not invent a Stripe receipt before StickerMailed", () => {
    const proof = buildRenewalProof(source({ status: "Completed" }));
    expect(proof.available).toBe(false);
    expect(proof.paymentCharged).toBe(false);
    expect(proof.paymentNote).toMatch(/not a payment receipt/i);
  });
});

describe("buildRenewalReceiptText", () => {
  it("writes a downloadable confirmation without claiming payment", () => {
    const text = buildRenewalReceiptText(buildRenewalProof(source()));
    expect(text).toContain("REGI renewal confirmation");
    expect(text).toContain("Confirmation: ren_proof_1");
    expect(text).toContain("Mom's Tahoe");
    expect(text).toContain("Plate: REGI01");
    expect(text).toContain("Fee estimate (not charged)");
    expect(text).toContain("$69.00");
    expect(text).toContain("Sticker mailed");
    expect(text).toContain("registration-card.pdf (PDF)");
    expect(text).not.toMatch(/stripe/i);
    expect(text).not.toMatch(/payment receipt id/i);
    expect(text).toContain(RENEWAL_PROOF_PAYMENT_NOTE);
  });

  it("names the download from the vehicle, not a payment id", () => {
    expect(renewalReceiptFilename(buildRenewalProof(source()))).toBe(
      "regi-renewal-confirmation-mom-s-tahoe.txt",
    );
  });

  it("escapes HTML for a printable confirmation view", () => {
    const html = buildRenewalReceiptHtml(
      buildRenewalProof(
        source({
          registration: {
            nickname: 'Tahoe <script>alert(1)</script>',
            year: 2021,
            make: "Chevrolet",
            model: "Tahoe",
            plate: "REGI01",
            vin: "1GNSKCKC8MR312456",
            state: "UT",
          },
        }),
      ),
    );
    expect(html).toContain("REGI renewal confirmation");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
