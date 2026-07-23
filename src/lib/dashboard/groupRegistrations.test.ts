import { describe, expect, it } from "vitest";
import { groupDashboardRegistrations } from "@/lib/dashboard/groupRegistrations";
import type { RegistrationDto } from "@/lib/registrations/types";

function registration(
  overrides: Partial<RegistrationDto> &
    Pick<
      RegistrationDto,
      "id" | "status" | "daysUntilExpiration" | "registrationExpiresOn"
    >,
): RegistrationDto {
  return {
    householdId: "hh1",
    householdRole: "owner",
    canEdit: true,
    type: "passenger",
    vin: null,
    plate: null,
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
    countdown: "Expires in 10 days",
    ...overrides,
  };
}

describe("groupDashboardRegistrations", () => {
  it("returns empty groups for an empty garage", () => {
    expect(groupDashboardRegistrations([])).toEqual({
      expired: [],
      upcoming: [],
      renewTarget: null,
    });
  });

  it("sorts upcoming soonest-first and expired most-overdue-first", () => {
    const currentFar = registration({
      id: "far",
      status: "Current",
      daysUntilExpiration: 200,
      registrationExpiresOn: "2027-02-01",
    });
    const dueSoon = registration({
      id: "soon",
      status: "Due Soon",
      daysUntilExpiration: 14,
      registrationExpiresOn: "2026-08-05",
    });
    const expiredMild = registration({
      id: "exp-mild",
      status: "Expired",
      daysUntilExpiration: -3,
      registrationExpiresOn: "2026-07-19",
      countdown: "Expired 3 days ago",
    });
    const expiredBad = registration({
      id: "exp-bad",
      status: "Expired",
      daysUntilExpiration: -40,
      registrationExpiresOn: "2026-06-12",
      countdown: "Expired 40 days ago",
    });

    const groups = groupDashboardRegistrations([
      currentFar,
      expiredMild,
      dueSoon,
      expiredBad,
    ]);

    expect(groups.expired.map((r) => r.id)).toEqual(["exp-bad", "exp-mild"]);
    expect(groups.upcoming.map((r) => r.id)).toEqual(["soon", "far"]);
  });

  it("picks renewTarget as first expired, else soonest due-soon", () => {
    const expired = registration({
      id: "exp",
      status: "Expired",
      daysUntilExpiration: -2,
      registrationExpiresOn: "2026-07-20",
    });
    const dueSoon = registration({
      id: "soon",
      status: "Due Soon",
      daysUntilExpiration: 7,
      registrationExpiresOn: "2026-07-29",
    });
    const current = registration({
      id: "ok",
      status: "Current",
      daysUntilExpiration: 120,
      registrationExpiresOn: "2026-11-20",
    });

    expect(
      groupDashboardRegistrations([dueSoon, expired, current]).renewTarget
        ?.id,
    ).toBe("exp");
    expect(
      groupDashboardRegistrations([current, dueSoon]).renewTarget?.id,
    ).toBe("soon");
    expect(groupDashboardRegistrations([current]).renewTarget).toBeNull();
  });

  it("skips viewer-only registrations for renewTarget", () => {
    const sharedExpired = registration({
      id: "shared-exp",
      status: "Expired",
      daysUntilExpiration: -5,
      registrationExpiresOn: "2026-07-17",
      householdRole: "viewer",
      canEdit: false,
    });
    const ownedDueSoon = registration({
      id: "owned-soon",
      status: "Due Soon",
      daysUntilExpiration: 10,
      registrationExpiresOn: "2026-08-01",
    });

    expect(
      groupDashboardRegistrations([sharedExpired, ownedDueSoon]).renewTarget
        ?.id,
    ).toBe("owned-soon");
    expect(
      groupDashboardRegistrations([sharedExpired]).renewTarget,
    ).toBeNull();
  });
});
