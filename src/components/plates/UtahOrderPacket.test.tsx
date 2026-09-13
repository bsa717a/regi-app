/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { estimateUtahPersonalizedPlateFees } from "@/lib/plates/utah";
import { UtahOrderPacket } from "./UtahOrderPacket";

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const fees = estimateUtahPersonalizedPlateFees();
const draft = {
  plateTypeId: "standard_life_elevated" as const,
  plateDesignId: "standard_life_elevated_arches",
  plateDesignLabel: "Life Elevated Arches",
  combos: ["REGI01", "REGI02", "REGI03"],
  meaning: "Family nickname",
  last4Vin: "2456",
};

async function renderPacket() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <UtahOrderPacket
        draft={draft}
        fees={fees}
        preview={{
          src: "/plates/utah/life-elevated-arches.png",
          alt: "Utah Life Elevated Arches license plate",
          width: 400,
          height: 199,
        }}
      />,
    );
  });
  return container;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
});

describe("UtahOrderPacket", () => {
  it("shows a sticky packet with design, three combos, meaning, fees, and copy buttons", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });

    const view = await renderPacket();

    expect(view.textContent).toContain("Your order packet");
    expect(view.textContent).toContain("Life Elevated Arches");
    expect(view.textContent).toContain("REGI01");
    expect(view.textContent).toContain("REGI02");
    expect(view.textContent).toContain("REGI03");
    expect(view.textContent).toContain("Family nickname");
    expect(view.textContent).toContain("2456");
    expect(view.textContent).toContain("$75.00");
    expect(view.textContent).toMatch(/Keep this packet available while you work in the other tab/i);
    expect(view.textContent).toMatch(/does not prefill MVP or skip payment/i);
    expect(view.querySelector('[data-testid="utah-order-packet"]')?.className).toMatch(
      /sticky/,
    );
    expect(
      view.querySelector('img[alt="Utah Life Elevated Arches license plate"]'),
    ).toBeTruthy();

    await act(async () => {
      (view.querySelector('[data-testid="utah-copy-combo-0"]') as HTMLButtonElement).click();
    });
    expect(writeText).toHaveBeenCalledWith("REGI01");

    await act(async () => {
      (view.querySelector('[data-testid="utah-copy-meaning"]') as HTMLButtonElement).click();
    });
    expect(writeText).toHaveBeenCalledWith("Family nickname");

    await act(async () => {
      (view.querySelector('[data-testid="utah-copy-fees"]') as HTMLButtonElement).click();
    });
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Estimated initial total: $75.00"),
    );

    await act(async () => {
      (view.querySelector('[data-testid="utah-copy-packet"]') as HTMLButtonElement).click();
    });
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Your order packet"),
    );
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Choice 2: REGI02"));
  });
});
