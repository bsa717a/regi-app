/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { click, render } from "@/components/test/render";
import { GarageEmptyIllustration } from "@/components/garage/GarageEmptyIllustration";
import { GarageEmptyState } from "@/components/garage/GarageEmptyState";

describe("GarageEmptyIllustration", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders an inline SVG of an empty bay, not a photo", async () => {
    const { container, unmount } = await render(<GarageEmptyIllustration />);

    const frame = container.querySelector(
      '[data-testid="garage-empty-illustration"]',
    );
    expect(frame).toBeTruthy();
    expect(frame?.querySelector("svg")).toBeTruthy();
    expect(frame?.querySelector("img")).toBeNull();
    expect(container.textContent).toMatch(/Empty garage bay ready for a first registration/);
    expect(container.textContent).not.toMatch(/person|portrait|photo/i);

    await unmount();
  });
});

describe("GarageEmptyState", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows first-run copy, illustration, and a clear add CTA", async () => {
    const onAdd = vi.fn();
    const { container, unmount } = await render(
      <GarageEmptyState onAdd={onAdd} />,
    );

    const section = container.querySelector('[data-testid="garage-empty-state"]');
    expect(section).toBeTruthy();
    expect(section?.textContent).toContain("Your garage");
    expect(section?.textContent).toContain("Add your first registration");
    expect(section?.textContent).toContain("Passenger vehicle, motorcycle, trailer");
    expect(
      container.querySelector('[data-testid="garage-empty-illustration"] svg'),
    ).toBeTruthy();

    const cta = container.querySelector(
      '[data-testid="add-first-registration-button"]',
    );
    expect(cta?.textContent).toBe("Add a registration");
    expect(cta?.tagName).toBe("BUTTON");

    await click(cta as HTMLElement);
    expect(onAdd).toHaveBeenCalledTimes(1);

    const plates = container.querySelector('a[href="/garage/plates"]');
    expect(plates?.textContent).toContain("Plan a personalized plate");

    await unmount();
  });

  it("uses dark-mode classes so the empty state tracks app theme", async () => {
    const { container, unmount } = await render(
      <GarageEmptyState onAdd={() => undefined} />,
    );

    const html = container.innerHTML;
    expect(html).toContain("dark:text-teal-300");
    expect(html).toContain("dark:text-slate-100");
    expect(html).toContain("dark:border-slate-700/80");
    expect(html).toContain("dark:fill-slate-900");
    expect(html).toContain("dark:stroke-teal-300/40");

    await unmount();
  });
});
