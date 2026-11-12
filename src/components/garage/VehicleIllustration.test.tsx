/** @vitest-environment jsdom */

import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/components/test/render";
import { VehicleIllustration } from "@/components/garage/VehicleIllustration";
import { FALLBACK_ILLUSTRATION_ART } from "@/lib/registrations/illustrations";

describe("VehicleIllustration catalog photos", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the owned R1T side profile when the household has no photo", async () => {
    const { container, unmount } = await render(
      <VehicleIllustration
        year={2023}
        make="Rivian"
        model="R1T"
        label="2023 Rivian R1T"
        registrationType="passenger"
      />,
    );

    const img = container.querySelector('[data-testid="garage-vehicle-photo"]');
    expect(img?.getAttribute("src")).toBe("/images/vehicles/rivian-r1t-2022.webp");
    expect(img?.className).toContain("object-contain");
    expect(img?.getAttribute("alt")).toBe("2023 Rivian R1T");
    await unmount();
  });

  it("keeps a household-uploaded photo ahead of the catalog", async () => {
    const { container, unmount } = await render(
      <VehicleIllustration
        year={2023}
        make="Rivian"
        model="R1T"
        label="2023 Rivian R1T"
        photoUrl="https://example.com/household-rivian.jpg"
        registrationType="passenger"
      />,
    );

    const img = container.querySelector('[data-testid="garage-vehicle-photo"]');
    expect(img?.getAttribute("src")).toBe(
      "https://example.com/household-rivian.jpg",
    );
    await unmount();
  });

  it("uses a raster side profile when there is no photo and no catalog art", async () => {
    const { container, unmount } = await render(
      <VehicleIllustration
        year={2003}
        make="Honda"
        model="Accord"
        bodyClass="Sedan"
        label="2003 Honda Accord"
        registrationType="passenger"
      />,
    );

    expect(container.querySelector("svg")).toBeNull();
    const light = container.querySelector(
      '[data-testid="garage-vehicle-fallback-light"]',
    );
    const dark = container.querySelector(
      '[data-testid="garage-vehicle-fallback-dark"]',
    );
    expect(light?.getAttribute("src")).toBe(
      "/images/garage/fallback/sedan-light.webp",
    );
    expect(dark?.getAttribute("src")).toBe(
      "/images/garage/fallback/sedan-dark.webp",
    );
    expect(light?.getAttribute("width")).toBe("2400");
    expect(light?.getAttribute("height")).toBe("1000");
    await unmount();
  });

  it("uses the sedan render when the body class is unknown", async () => {
    const { container, unmount } = await render(
      <VehicleIllustration
        year={2003}
        make="Honda"
        model="Accord"
        label="Walk car"
        registrationType="passenger"
      />,
    );

    expect(container.querySelector("svg")).toBeNull();
    expect(
      container
        .querySelector('[data-testid="garage-vehicle-fallback-light"]')
        ?.getAttribute("src"),
    ).toBe("/images/garage/fallback/sedan-light.webp");
    expect(
      container
        .querySelector('[data-testid="garage-vehicle-fallback-dark"]')
        ?.getAttribute("src"),
    ).toBe("/images/garage/fallback/sedan-dark.webp");
    await unmount();
  });

  it("ships a light and dark webp for every fallback kind", () => {
    for (const art of Object.values(FALLBACK_ILLUSTRATION_ART)) {
      for (const src of [art.light, art.dark]) {
        expect(src.endsWith(".webp")).toBe(true);
        expect(src.includes(".svg")).toBe(false);
        const file = path.join(process.cwd(), "public", src);
        expect(existsSync(file), file).toBe(true);
      }
    }
  });
});
