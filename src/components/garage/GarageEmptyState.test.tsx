/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { click, render } from "@/components/test/render";
import { GarageEmptyState } from "@/components/garage/GarageEmptyState";

describe("GarageEmptyState", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the empty-garage copy and both ways to add a vehicle", async () => {
    const onScanCard = vi.fn();
    const onEnterVin = vi.fn();
    const { container, unmount } = await render(
      <GarageEmptyState onScanCard={onScanCard} onEnterVin={onEnterVin} />,
    );

    const section = container.querySelector('[data-testid="garage-empty-state"]');
    expect(section).toBeTruthy();
    expect(section?.textContent).toContain("Your garage is empty");
    expect(section?.textContent).toContain("Add a vehicle and REGI takes it from there");

    const scan = container.querySelector(
      '[data-testid="add-first-registration-button"]',
    );
    expect(scan?.textContent).toBe("Scan a registration card");
    await click(scan as HTMLElement);
    expect(onScanCard).toHaveBeenCalledTimes(1);

    const vin = container.querySelector('[data-testid="enter-vin-button"]');
    expect(vin?.textContent).toBe("Enter a VIN instead");
    await click(vin as HTMLElement);
    expect(onEnterVin).toHaveBeenCalledTimes(1);

    await unmount();
  });
});
