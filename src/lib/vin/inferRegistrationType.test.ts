import { describe, expect, it } from "vitest";
import { inferRegistrationTypeFromNhtsaRow } from "@/lib/vin/inferRegistrationType";

describe("inferRegistrationTypeFromNhtsaRow", () => {
  it("maps passenger cars", () => {
    expect(
      inferRegistrationTypeFromNhtsaRow({
        VehicleType: "PASSENGER CAR",
        BodyClass: "Coupe",
      }),
    ).toBe("passenger");
  });

  it("maps travel trailers before motorhome body-class signals", () => {
    expect(
      inferRegistrationTypeFromNhtsaRow({
        VehicleType: "TRAILER",
        BodyClass: "Travel Trailer/Recreational Vehicle",
        TrailerType: "Travel Trailer",
      }),
    ).toBe("trailer");
  });

  it("maps motorhomes from model/body class", () => {
    expect(
      inferRegistrationTypeFromNhtsaRow({
        VehicleType: "INCOMPLETE VEHICLE",
        BodyClass: "Incomplete - Stripped Chassis",
        Model: "Motorhome Chassis",
        Make: "FORD",
      }),
    ).toBe("motorhome");
  });

  it("maps motorcycles", () => {
    expect(
      inferRegistrationTypeFromNhtsaRow({
        VehicleType: "MOTORCYCLE",
        BodyClass: "Motorcycle - Touring/Sport Touring",
      }),
    ).toBe("motorcycle");
  });

  it("maps trailers", () => {
    expect(
      inferRegistrationTypeFromNhtsaRow({
        VehicleType: "TRAILER",
        BodyClass: "Trailer",
        TrailerType: "Fifth Wheel",
      }),
    ).toBe("trailer");
  });

  it("maps OHV from body class even when VehicleType is MOTORCYCLE", () => {
    expect(
      inferRegistrationTypeFromNhtsaRow({
        VehicleType: "MOTORCYCLE",
        BodyClass: "All Terrain Vehicle (ATV)",
      }),
    ).toBe("ohv");
  });

  it("maps motorcycle when VehicleType is MOTORCYCLE", () => {
    expect(
      inferRegistrationTypeFromNhtsaRow({
        VehicleType: "MOTORCYCLE",
        BodyClass: "",
      }),
    ).toBe("motorcycle");
  });

  it("returns null when NHTSA has no type signals", () => {
    expect(inferRegistrationTypeFromNhtsaRow({})).toBeNull();
    expect(inferRegistrationTypeFromNhtsaRow(null)).toBeNull();
  });
});
