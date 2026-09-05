import { describe, expect, it } from "vitest";
import {
  buildAdminUserListWhere,
  clampUserListLimit,
  serializeAdminUserListItem,
} from "./users";

describe("buildAdminUserListWhere", () => {
  it("returns an empty filter when the query is blank", () => {
    expect(buildAdminUserListWhere("")).toEqual({});
    expect(buildAdminUserListWhere("   ")).toEqual({});
  });

  it("matches email or name case-insensitively", () => {
    expect(buildAdminUserListWhere("  Alex  ")).toEqual({
      OR: [
        { email: { contains: "Alex", mode: "insensitive" } },
        { name: { contains: "Alex", mode: "insensitive" } },
        { city: { contains: "Alex", mode: "insensitive" } },
        { addressLine1: { contains: "Alex", mode: "insensitive" } },
      ],
    });
  });
});

describe("clampUserListLimit", () => {
  it("defaults and clamps", () => {
    expect(clampUserListLimit(undefined)).toBe(100);
    expect(clampUserListLimit(NaN)).toBe(100);
    expect(clampUserListLimit(0)).toBe(1);
    expect(clampUserListLimit(999)).toBe(200);
    expect(clampUserListLimit(25)).toBe(25);
  });
});

describe("serializeAdminUserListItem", () => {
  it("maps counts from the owned household and renewal relation", () => {
    expect(
      serializeAdminUserListItem({
        id: "user_1",
        firebaseUid: "fb-1",
        email: "alex@regi.app",
        name: "Alex Demo",
        phone: "555-0100",
        addressLine1: "123 Main St",
        addressLine2: null,
        city: "Salt Lake City",
        addressState: "UT",
        postalCode: "84101",
        role: "admin",
        createdAt: new Date("2026-01-15T12:00:00.000Z"),
        _count: { requestedRenewals: 2 },
        ownedHouseholds: [{ _count: { registrations: 3 } }],
      }),
    ).toEqual({
      id: "user_1",
      firebaseUid: "fb-1",
      email: "alex@regi.app",
      name: "Alex Demo",
      phone: "555-0100",
      addressLine1: "123 Main St",
      addressLine2: null,
      city: "Salt Lake City",
      addressState: "UT",
      postalCode: "84101",
      role: "admin",
      createdAt: "2026-01-15T12:00:00.000Z",
      registrationCount: 3,
      renewalCount: 2,
    });
  });

  it("uses zero registrations when the user has no owned household", () => {
    expect(
      serializeAdminUserListItem({
        id: "user_2",
        firebaseUid: "fb-2",
        email: "sam@regi.app",
        name: null,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        addressState: null,
        postalCode: null,
        role: "user",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        _count: { requestedRenewals: 0 },
        ownedHouseholds: [],
      }),
    ).toMatchObject({
      registrationCount: 0,
      renewalCount: 0,
      name: null,
      phone: null,
    });
  });
});
