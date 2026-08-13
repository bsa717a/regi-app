import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    registrationRecall: { findMany },
  },
}));

import { countOpenRecallsByRegistration } from "./openCounts";

describe("countOpenRecallsByRegistration", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("returns zeros for empty input", async () => {
    const counts = await countOpenRecallsByRegistration([]);
    expect(counts.size).toBe(0);
  });

  it("counts only active open recalls from the latest sync", async () => {
    const checkedAt = new Date("2026-08-13T12:00:00.000Z");
    findMany.mockResolvedValue([
      {
        registrationId: "reg_a",
        status: "open",
        lastSeenAt: checkedAt,
      },
      {
        registrationId: "reg_a",
        status: "open",
        lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        registrationId: "reg_b",
        status: "open",
        lastSeenAt: checkedAt,
      },
    ]);

    const counts = await countOpenRecallsByRegistration([
      {
        id: "reg_a",
        type: "passenger",
        year: 2020,
        make: "Honda",
        model: "Civic",
        recallsCheckedAt: checkedAt,
      },
      {
        id: "reg_b",
        type: "passenger",
        year: 2019,
        make: "Toyota",
        model: "Camry",
        recallsCheckedAt: checkedAt,
      },
      {
        id: "reg_c",
        type: "passenger",
        year: 2019,
        make: "Toyota",
        model: "Camry",
        recallsCheckedAt: checkedAt,
      },
    ]);

    expect(counts.get("reg_a")).toBe(1);
    expect(counts.get("reg_b")).toBe(1);
    expect(counts.get("reg_c")).toBe(0);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "open" }),
      }),
    );
  });

  it("returns zero for ineligible registration types", async () => {
    findMany.mockResolvedValue([
      {
        registrationId: "reg_boat",
        status: "open",
        lastSeenAt: new Date("2026-08-13T12:00:00.000Z"),
      },
    ]);

    const counts = await countOpenRecallsByRegistration([
      {
        id: "reg_boat",
        type: "boat",
        year: 2020,
        make: "Sea Ray",
        model: "SPX",
        recallsCheckedAt: new Date("2026-08-13T12:00:00.000Z"),
      },
    ]);

    expect(counts.get("reg_boat")).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("fails soft when query throws", async () => {
    findMany.mockRejectedValue(new Error("table missing"));

    const counts = await countOpenRecallsByRegistration([
      {
        id: "reg_a",
        type: "passenger",
        year: 2020,
        make: "Honda",
        model: "Civic",
        recallsCheckedAt: new Date("2026-08-13T12:00:00.000Z"),
      },
    ]);

    expect(counts.get("reg_a")).toBe(0);
  });
});
