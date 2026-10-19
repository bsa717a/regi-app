import { describe, expect, it } from "vitest";
import { genericVehicleRaster } from "@/lib/registrations/vehicleCatalogImage";

describe("genericVehicleRaster", () => {
  it("picks a neutral body raster and never a branded catalog file", () => {
    expect(genericVehicleRaster({ bodyClass: "Pickup" })).toBe(
      "/images/vehicles/generic/pickup.webp",
    );
    expect(genericVehicleRaster({ bodyClass: "Sedan/Saloon" })).toBe(
      "/images/vehicles/generic/sedan.webp",
    );
    expect(
      genericVehicleRaster({
        registrationType: "motorcycle",
        bodyClass: "Motorcycle",
      }),
    ).toBe("/images/vehicles/generic/motorcycle.webp");
    expect(genericVehicleRaster({ registrationType: "trailer" })).toBe(
      "/images/vehicles/generic/trailer.webp",
    );
    expect(genericVehicleRaster({})).toBe("/images/vehicles/generic/default.webp");
  });
});
