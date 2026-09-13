import { describe, expect, it } from "vitest";
import {
  dashboardExpirationSummary,
  dashboardFocusRegistration,
} from "@/lib/dashboard/expirationSummary";
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

describe("dashboardFocusRegistration", () => {
  it("returns null for an empty garage", () => {
    expect(dashboardFocusRegistration(groupDashboardRegistrations([]))).toBeNull();
  });

  it("prefers the most overdue expired registration", () => {
    const groups = groupDashboardRegistrations([
      registration({
        id: "ok",
        status: "Current",
        daysUntilExpiration: 200,
        registrationExpiresOn: "2027-02-01",
        countdown: "Expires in 200 days",
      }),
      registration({
        id: "exp-mild",
        status: "Expired",
        daysUntilExpiration: -3,
        registrationExpiresOn: "2026-07-19",
        countdown: "Expired 3 days ago",
      }),
      registration({
        id: "exp-bad",
        status: "Expired",
        daysUntilExpiration: -40,
        registrationExpiresOn: "2026-06-12",
        countdown: "Expired 40 days ago",
      }),
    ]);

    expect(dashboardFocusRegistration(groups)?.id).toBe("exp-bad");
  });

  it("falls back to the soonest upcoming when nothing is expired", () => {
    const groups = groupDashboardRegistrations([
      registration({
        id: "far",
        status: "Current",
        daysUntilExpiration: 200,
        registrationExpiresOn: "2027-02-01",
        countdown: "Expires in 200 days",
      }),
      registration({
        id: "soon",
        status: "Due Soon",
        daysUntilExpiration: 14,
        registrationExpiresOn: "2026-08-05",
        countdown: "Expires in 14 days",
      }),
    ]);

    expect(dashboardFocusRegistration(groups)?.id).toBe("soon");
  });
});

describe("dashboardExpirationSummary", () => {
  it("returns null when there are no registrations", () => {
    expect(dashboardExpirationSummary(groupDashboardRegistrations([]))).toBeNull();
  });

  it("surfaces Garage countdown for a current registration", () => {
    const groups = groupDashboardRegistrations([
      registration({
        id: "ok",
        status: "Current",
        daysUntilExpiration: 200,
        registrationExpiresOn: "2027-02-01",
        countdown: "Expires in 200 days",
      }),
    ]);

    expect(dashboardExpirationSummary(groups)).toEqual({
      countdown: "Expires in 200 days",
      status: "Current",
      daysUntilExpiration: 200,
      label: "Expires in 200 days",
    });
  });

  it("uses the soonest due-soon countdown", () => {
    const groups = groupDashboardRegistrations([
      registration({
        id: "soon",
        status: "Due Soon",
        daysUntilExpiration: 14,
        registrationExpiresOn: "2026-08-05",
        countdown: "Expires in 14 days",
      }),
    ]);

    expect(dashboardExpirationSummary(groups)?.label).toBe("Expires in 14 days");
    expect(dashboardExpirationSummary(groups)?.status).toBe("Due Soon");
  });

  it("uses expired countdown when one registration is expired", () => {
    const groups = groupDashboardRegistrations([
      registration({
        id: "exp",
        status: "Expired",
        daysUntilExpiration: -12,
        registrationExpiresOn: "2026-07-10",
        countdown: "Expired 12 days ago",
      }),
    ]);

    expect(dashboardExpirationSummary(groups)).toEqual({
      countdown: "Expired 12 days ago",
      status: "Expired",
      daysUntilExpiration: -12,
      label: "Expired 12 days ago",
    });
  });

  it("prefixes a count when several registrations are expired", () => {
    const groups = groupDashboardRegistrations([
      registration({
        id: "exp-mild",
        status: "Expired",
        daysUntilExpiration: -3,
        registrationExpiresOn: "2026-07-19",
        countdown: "Expired 3 days ago",
      }),
      registration({
        id: "exp-bad",
        status: "Expired",
        daysUntilExpiration: -40,
        registrationExpiresOn: "2026-06-12",
        countdown: "Expired 40 days ago",
      }),
    ]);

    expect(dashboardExpirationSummary(groups)?.label).toBe(
      "2 expired · Expired 40 days ago",
    );
    expect(dashboardExpirationSummary(groups)?.daysUntilExpiration).toBe(-40);
  });
});
