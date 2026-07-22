import { describe, expect, it } from "vitest";
import { buildAdminSearchWhere, clampSearchLimit } from "./search";

describe("buildAdminSearchWhere", () => {
  it("returns null for blank queries", () => {
    expect(buildAdminSearchWhere("")).toBeNull();
    expect(buildAdminSearchWhere("   ")).toBeNull();
  });

  it("builds case-insensitive contains filters for users and vehicles", () => {
    const where = buildAdminSearchWhere("  REGI01  ");
    expect(where).not.toBeNull();
    expect(where!.userWhere).toEqual({
      OR: [
        { email: { contains: "REGI01", mode: "insensitive" } },
        { name: { contains: "REGI01", mode: "insensitive" } },
      ],
    });
    expect(where!.vehicleWhere).toEqual({
      OR: [
        { plate: { contains: "REGI01", mode: "insensitive" } },
        { vin: { contains: "REGI01", mode: "insensitive" } },
        { nickname: { contains: "REGI01", mode: "insensitive" } },
        { make: { contains: "REGI01", mode: "insensitive" } },
        { model: { contains: "REGI01", mode: "insensitive" } },
      ],
    });
  });
});

describe("clampSearchLimit", () => {
  it("defaults and clamps", () => {
    expect(clampSearchLimit(undefined)).toBe(25);
    expect(clampSearchLimit(NaN)).toBe(25);
    expect(clampSearchLimit(0)).toBe(1);
    expect(clampSearchLimit(999)).toBe(50);
    expect(clampSearchLimit(10)).toBe(10);
  });
});
