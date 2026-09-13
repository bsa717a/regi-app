/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/components/test/render";
import { exampleRenewal } from "@/lib/renewals/exampleRenewal";
import { buildRenewalProof } from "@/lib/renewals/proof";
import { RenewalReceipt } from "./RenewalReceipt";

describe("RenewalReceipt", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows confirmation, history, and download after StickerMailed", async () => {
    const renewal = exampleRenewal();
    const { container, unmount } = await render(
      <RenewalReceipt proof={buildRenewalProof(renewal)} documents={renewal.documents} />,
    );

    expect(container.querySelector('[data-testid="renewal-receipt"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="renewal-confirmation-number"]')
        ?.textContent,
    ).toBe("ren_proof_1");
    expect(container.textContent).toContain("Confirmation for Mom's Tahoe");
    expect(container.textContent).toContain("Sticker Mailed");
    expect(container.textContent).toContain("registration-card.pdf");
    expect(container.textContent).toContain("not a payment receipt");
    expect(container.querySelector('[data-testid="download-renewal-receipt"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="payment-not-required"]')).not.toBeNull();
    const history = container.querySelector('[data-testid="renewal-status-history"]');
    expect(history?.textContent).toContain("Documents Received");
    expect(history?.textContent).toContain("Sticker Mailed");
    await unmount();
  });

  it("hides download before the sticker is mailed", async () => {
    const renewal = exampleRenewal({
      status: "Completed",
      timestamps: {
        ...exampleRenewal().timestamps,
        stickerMailedAt: null,
      },
    });
    const { container, unmount } = await render(
      <RenewalReceipt proof={buildRenewalProof(renewal)} />,
    );

    expect(container.textContent).toContain("Proof not ready yet");
    expect(container.querySelector('[data-testid="download-renewal-receipt"]')).toBeNull();
    expect(container.textContent).toContain("not a payment receipt");
    await unmount();
  });

  it("downloads the text confirmation without inventing a Stripe receipt", async () => {
    const clicks: Array<{ download: string; href: string }> = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = createElement(tag);
      if (tag === "a") {
        Object.defineProperty(el, "click", {
          value: () => {
            clicks.push({
              download: (el as HTMLAnchorElement).download,
              href: (el as HTMLAnchorElement).href,
            });
          },
        });
      }
      return el;
    });
    const createObjectURL = vi.fn(() => "blob:receipt");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    const { container, unmount } = await render(
      <RenewalReceipt proof={buildRenewalProof(exampleRenewal())} />,
    );
    const button = container.querySelector(
      '[data-testid="download-renewal-receipt"]',
    );
    expect(button).not.toBeNull();
    (button as HTMLButtonElement).click();

    expect(clicks[0]?.download).toBe("regi-renewal-confirmation-mom-s-tahoe.txt");
    expect(createObjectURL).toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toContain("text/plain");
    await unmount();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
