import { describe, expect, it } from "vitest";
import { vehicleCatalogImage } from "@/lib/registrations/vehicleCatalogImage";

describe("vehicleCatalogImage", () => {
  it("picks the owned side profile for a known year, make, and model", () => {
    expect(
      vehicleCatalogImage({ year: 2022, make: "Ford", model: "F-150" }),
    ).toBe("/images/vehicles/ford-f-150-2021.webp");
    expect(
      vehicleCatalogImage({
        year: 2013,
        make: "Volkswagen",
        model: "Touareg",
      }),
    ).toBe("/images/vehicles/volkswagen-touareg-2011.webp");
    expect(
      vehicleCatalogImage({ year: 2021, make: "Chevrolet", model: "Tahoe" }),
    ).toBe("/images/vehicles/chevrolet-tahoe-2021.webp");
    expect(
      vehicleCatalogImage({ year: 2019, make: "Tesla", model: "Model 3" }),
    ).toBe("/images/vehicles/tesla-model-3-2017.webp");
  });

  it("accepts trim suffixes and make aliases inside the same generation", () => {
    expect(
      vehicleCatalogImage({ year: 2021, make: "Ford", model: "F150 XLT" }),
    ).toBe("/images/vehicles/ford-f-150-2021.webp");
    expect(
      vehicleCatalogImage({ year: 2013, make: "VW", model: "Touareg" }),
    ).toBe("/images/vehicles/volkswagen-touareg-2011.webp");
  });

  it("does not reuse a generation photo for a different model year", () => {
    expect(
      vehicleCatalogImage({ year: 1999, make: "Ford", model: "F-150" }),
    ).toBeNull();
    expect(
      vehicleCatalogImage({ year: 2018, make: "Volkswagen", model: "Touareg" }),
    ).toBeNull();
  });

  it("uses the full trailer profile and otherwise falls back when identity is missing", () => {
    expect(vehicleCatalogImage({ registrationType: "trailer" })).toBe(
      "/images/vehicles/utility-trailer.webp",
    );
    expect(
      vehicleCatalogImage({ year: 2022, make: "Ford", model: "" }),
    ).toBeNull();
    expect(vehicleCatalogImage({ make: "Honda", model: "Civic", year: 2020 })).toBeNull();
  });
});
