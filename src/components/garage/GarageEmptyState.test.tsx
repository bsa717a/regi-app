/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { click, render } from "@/components/test/render";
import {
  EMPTY_GARAGE_ART,
  GarageEmptyIllustration,
} from "@/components/garage/GarageEmptyIllustration";
import { GarageEmptyState } from "@/components/garage/GarageEmptyState";

describe("GarageEmptyIllustration", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders light and dark WebP rasters, not an SVG", async () => {
    const { container, unmount } = await render(<GarageEmptyIllustration />);

    const frame = container.querySelector(
      '[data-testid="garage-empty-illustration"]',
    );
    expect(frame).toBeTruthy();
    expect(frame?.querySelector("svg")).toBeNull();

    const images = [...container.querySelectorAll("img")];
    expect(images).toHaveLength(2);
    expect(images.map((img) => img.getAttribute("src"))).toEqual([
      EMPTY_GARAGE_ART.light,
      EMPTY_GARAGE_ART.dark,
    ]);
    expect(EMPTY_GARAGE_ART.light).toMatch(/\.webp$/);
    expect(EMPTY_GARAGE_ART.dark).toMatch(/\.webp$/);
    expect(images[0]?.getAttribute("alt")).toBe(
      "Empty garage bay ready for a first registration",
    );
    expect(images[0]?.className).toContain("dark:hidden");
    expect(images[1]?.className).toContain("hidden");
    expect(images[1]?.className).toContain("dark:block");

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
      container.querySelector(
        `[data-testid="garage-empty-illustration"] img[src="${EMPTY_GARAGE_ART.light}"]`,
      ),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="garage-empty-illustration"] svg'),
    ).toBeNull();

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
    expect(html).toContain("dark:hidden");
    expect(html).toContain("dark:block");
    expect(html).toContain(EMPTY_GARAGE_ART.dark);

    await unmount();
  });
});
