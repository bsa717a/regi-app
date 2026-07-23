import { describe, expect, it } from "vitest";
import {
  isRegistrationDocumentGcsPath,
  isVehiclePhotoGcsPath,
} from "@/lib/storage/gcsPaths";

describe("gcsPaths", () => {
  it("detects garage photo object keys", () => {
    expect(
      isVehiclePhotoGcsPath(
        "households/hh/registrations/reg_1/photo/11111111-2222-3333-4444-555555555555.jpg",
      ),
    ).toBe(true);
    expect(
      isVehiclePhotoGcsPath(
        "households/hh/registrations/reg_1/uuid-reg-card.pdf",
      ),
    ).toBe(false);
  });

  it("allows vault paths but not photo paths", () => {
    expect(
      isRegistrationDocumentGcsPath(
        "households/hh/registrations/reg_1/uuid-reg-card.pdf",
        { householdId: "hh", registrationId: "reg_1" },
      ),
    ).toBe(true);
    expect(
      isRegistrationDocumentGcsPath(
        "households/hh/registrations/reg_1/photo/uuid.jpg",
        { householdId: "hh", registrationId: "reg_1" },
      ),
    ).toBe(false);
  });
});
