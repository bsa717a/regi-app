import { describe, expect, it } from "vitest";
import { groupDashboardVehicles } from "@/lib/dashboard/groupVehicles";
import type { VehicleDto } from "@/lib/vehicles/types";

function vehicle(
  overrides: Partial<VehicleDto> &
    Pick<VehicleDto, "id" | "status" | "daysUntilExpiration" | "registrationExpiresOn">,
): VehicleDto {
  return {
    householdId: "hh1",
    householdRole: "owner",
    canEdit: true,
    vin: null,
    plate: null,
    state: "UT",
    make: "Ford",
    model: "Escape",
    year: 2020,
    nickname: null,
    photoUrl: null,
    bodyClass: null,
    createdBy: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    countdown: "Expires in 10 days",
    ...overrides,
  };
}

describe("groupDashboardVehicles", () => {
  it("returns empty groups for an empty garage", () => {
    expect(groupDashboardVehicles([])).toEqual({
      expired: [],
      upcoming: [],
      renewTarget: null,
    });
  });

  it("sorts upcoming soonest-first and expired most-overdue-first", () => {
    const currentFar = vehicle({
      id: "far",
      status: "Current",
      daysUntilExpiration: 200,
      registrationExpiresOn: "2027-02-01",
    });
    const dueSoon = vehicle({
      id: "soon",
      status: "Due Soon",
      daysUntilExpiration: 14,
      registrationExpiresOn: "2026-08-05",
    });
    const expiredMild = vehicle({
      id: "exp-mild",
      status: "Expired",
      daysUntilExpiration: -3,
      registrationExpiresOn: "2026-07-19",
      countdown: "Expired 3 days ago",
    });
    const expiredBad = vehicle({
      id: "exp-bad",
      status: "Expired",
      daysUntilExpiration: -40,
      registrationExpiresOn: "2026-06-12",
      countdown: "Expired 40 days ago",
    });

    const groups = groupDashboardVehicles([
      currentFar,
      expiredMild,
      dueSoon,
      expiredBad,
    ]);

    expect(groups.expired.map((v) => v.id)).toEqual(["exp-bad", "exp-mild"]);
    expect(groups.upcoming.map((v) => v.id)).toEqual(["soon", "far"]);
  });

  it("picks renewTarget as first expired, else soonest due-soon", () => {
    const expired = vehicle({
      id: "exp",
      status: "Expired",
      daysUntilExpiration: -2,
      registrationExpiresOn: "2026-07-20",
    });
    const dueSoon = vehicle({
      id: "soon",
      status: "Due Soon",
      daysUntilExpiration: 7,
      registrationExpiresOn: "2026-07-29",
    });
    const current = vehicle({
      id: "ok",
      status: "Current",
      daysUntilExpiration: 120,
      registrationExpiresOn: "2026-11-20",
    });

    expect(groupDashboardVehicles([dueSoon, expired, current]).renewTarget?.id).toBe(
      "exp",
    );
    expect(groupDashboardVehicles([current, dueSoon]).renewTarget?.id).toBe(
      "soon",
    );
    expect(groupDashboardVehicles([current]).renewTarget).toBeNull();
  });

  it("skips viewer-only vehicles for renewTarget", () => {
    const sharedExpired = vehicle({
      id: "shared-exp",
      status: "Expired",
      daysUntilExpiration: -5,
      registrationExpiresOn: "2026-07-17",
      householdRole: "viewer",
      canEdit: false,
    });
    const ownedDueSoon = vehicle({
      id: "owned-soon",
      status: "Due Soon",
      daysUntilExpiration: 10,
      registrationExpiresOn: "2026-08-01",
    });

    expect(
      groupDashboardVehicles([sharedExpired, ownedDueSoon]).renewTarget?.id,
    ).toBe("owned-soon");
    expect(groupDashboardVehicles([sharedExpired]).renewTarget).toBeNull();
  });
});
