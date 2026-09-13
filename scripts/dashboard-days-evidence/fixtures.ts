import type { RegistrationDto } from "@/lib/registrations/types";

function registration(
  overrides: Partial<RegistrationDto> &
    Pick<
      RegistrationDto,
      "id" | "status" | "daysUntilExpiration" | "countdown" | "registrationExpiresOn"
    >,
): RegistrationDto {
  return {
    householdId: "hh1",
    householdRole: "owner",
    canEdit: true,
    type: "passenger",
    vin: "1FT8W3DT5KEC12345",
    plate: "REGI01",
    state: "UT",
    make: "Ford",
    model: "Escape",
    year: 2020,
    nickname: null,
    photoUrl: null,
    photos: [],
    bodyClass: null,
    details: {},
    createdBy: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export const dueSoon = registration({
  id: "reg-soon",
  nickname: "Mom's Escape",
  make: "Ford",
  model: "Escape",
  year: 2020,
  plate: "ESC42",
  status: "Due Soon",
  daysUntilExpiration: 14,
  countdown: "Expires in 14 days",
  registrationExpiresOn: "2026-09-27",
});

export const currentFar = registration({
  id: "reg-current",
  nickname: "Dad's Tahoe",
  make: "Chevrolet",
  model: "Tahoe",
  year: 2021,
  plate: "TAH01",
  status: "Current",
  daysUntilExpiration: 200,
  countdown: "Expires in 200 days",
  registrationExpiresOn: "2027-04-01",
});

export const expired = registration({
  id: "reg-expired",
  nickname: "Work van",
  make: "Ford",
  model: "Transit",
  year: 2018,
  plate: "VAN9",
  status: "Expired",
  daysUntilExpiration: -12,
  countdown: "Expired 12 days ago",
  registrationExpiresOn: "2026-09-01",
});

export const attentionVehicles = [dueSoon, currentFar];
export const currentOnlyVehicles = [currentFar];
export const expiredVehicles = [expired, dueSoon];
