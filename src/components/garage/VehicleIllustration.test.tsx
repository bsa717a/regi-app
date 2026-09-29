/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@/components/test/render";
import { VehicleIllustration } from "@/components/garage/VehicleIllustration";

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
});
