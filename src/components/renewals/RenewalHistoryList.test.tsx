/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/components/test/render";
import { exampleRenewal } from "@/lib/renewals/exampleRenewal";
import { RenewalHistoryList } from "./RenewalHistoryList";

describe("RenewalHistoryList", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("explains the empty garage history state", async () => {
    const { container, unmount } = await render(
      <RenewalHistoryList renewals={[]} />,
    );
    expect(
      container.querySelector('[data-testid="renewal-history-empty"]')?.textContent,
    ).toMatch(/sticker is mailed/i);
    await unmount();
  });

  it("links terminal renewals to confirmation and keeps in-progress on the tracker", async () => {
    const mailed = exampleRenewal();
    const open = exampleRenewal({
      id: "ren_open_1",
      status: "Reviewing",
      proofAvailable: false,
      timestamps: {
        ...exampleRenewal().timestamps,
        processingAt: null,
        submittedAt: null,
        completedAt: null,
        stickerMailedAt: null,
      },
    });
    const { container, unmount } = await render(
      <RenewalHistoryList renewals={[mailed, open]} />,
    );

    expect(container.querySelector('[data-testid="renewal-history-list"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="view-renewal-receipt-ren_proof_1"]')
        ?.getAttribute("href"),
    ).toBe("/renewals/ren_proof_1/receipt");
    expect(
      container.querySelector('[data-testid="view-renewal-receipt-ren_open_1"]'),
    ).toBeNull();
    expect(container.textContent).toContain("Proof ready");
    expect(container.textContent).toContain("In progress");
    expect(container.textContent).toContain("View progress");
    await unmount();
  });
});
