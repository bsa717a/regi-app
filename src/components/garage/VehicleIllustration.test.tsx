/** @vitest-environment jsdom */

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/components/test/render";
import { VehicleIllustration } from "@/components/garage/VehicleIllustration";

const loadVehicleCatalogImage = vi.fn();

vi.mock("@/lib/registrations/vehicleCatalog/client", () => ({
  loadVehicleCatalogImage: (...args: unknown[]) => loadVehicleCatalogImage(...args),
}));

describe("VehicleIllustration", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    loadVehicleCatalogImage.mockReset();
  });

  it("shows a generic raster while a catalog lookup is still pending", async () => {
    let finish: (value: unknown) => void = () => {};
    loadVehicleCatalogImage.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { container, unmount } = await render(
      <VehicleIllustration
        year={2003}
        make="Honda"
        model="Accord"
        label="Walk car"
        registrationType="passenger"
        bodyClass="Sedan"
        getIdToken={async () => "token"}
      />,
    );

    const img = container.querySelector('[data-testid="garage-vehicle-photo"]');
    expect(img?.getAttribute("data-photo-source")).toBe("generic");
    expect(img?.getAttribute("src")).toBe("/images/vehicles/generic/sedan.webp");
    expect(container.querySelector("svg")).toBeNull();

    await act(async () => {
      finish({
        status: "ready",
        url: "/api/vehicle-catalog/assets/caccord2003aaaa",
        attribution: {
          author: "IFCAR",
          license: "Public domain",
          licenseUrl: null,
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Accord.jpg",
          sourceTitle: "Accord",
          shareAlike: false,
          retrievedAt: "2026-10-02T00:00:00.000Z",
        },
        generationLabel: "seventh generation",
        yearFrom: 2003,
        yearTo: 2007,
      });
    });

    expect(
      container
        .querySelector('[data-testid="garage-vehicle-photo"]')
        ?.getAttribute("src"),
    ).toBe("/api/vehicle-catalog/assets/caccord2003aaaa");
    await unmount();
  });

  it("keeps a household-uploaded photo ahead of the catalog", async () => {
    const { container, unmount } = await render(
      <VehicleIllustration
        year={2003}
        make="Honda"
        model="Accord"
        label="Walk car"
        photoUrl="https://example.com/household-accord.jpg"
        registrationType="passenger"
        getIdToken={async () => "token"}
      />,
    );

    const img = container.querySelector('[data-testid="garage-vehicle-photo"]');
    expect(img?.getAttribute("src")).toBe(
      "https://example.com/household-accord.jpg",
    );
    expect(img?.getAttribute("data-photo-source")).toBe("user");
    expect(loadVehicleCatalogImage).not.toHaveBeenCalled();
    await unmount();
  });
});
