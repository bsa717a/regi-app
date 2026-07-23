import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchModelsForMakeYear,
  fetchPassengerMakes,
  passengerModelYears,
} from "./nhtsaCatalog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("passengerModelYears", () => {
  it("returns descending years through next model year", () => {
    const years = passengerModelYears();
    const current = new Date().getFullYear();
    expect(years[0]).toBe(current + 1);
    expect(years[years.length - 1]).toBe(1981);
    expect(years).toHaveLength(current + 1 - 1981 + 1);
  });
});

describe("fetchPassengerMakes", () => {
  it("merges, deduplicates, and sorts makes across VPIC vehicle types", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        const results =
          url.includes("car")
            ? [
                { MakeId: 2, MakeName: "HONDA" },
                { MakeId: 2, MakeName: "HONDA" },
                { MakeId: 1, MakeName: "FORD" },
              ]
            : url.includes("truck")
              ? [{ MakeId: 3, MakeName: "RIVIAN" }, { MakeId: 1, MakeName: "FORD" }]
              : [{ MakeId: 3, MakeName: "RIVIAN" }];
        return {
          ok: true,
          json: async () => ({ Results: results }),
        };
      }),
    );

    const makes = await fetchPassengerMakes();
    expect(makes).toEqual([
      { id: 1, name: "FORD" },
      { id: 2, name: "HONDA" },
      { id: 3, name: "RIVIAN" },
    ]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("fetchModelsForMakeYear", () => {
  it("returns sorted unique model names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Results: [
            { Model_Name: "Pilot" },
            { Model_Name: "Civic" },
            { Model_Name: "Civic" },
          ],
        }),
      }),
    );

    const models = await fetchModelsForMakeYear("Honda", 2020);
    expect(models).toEqual([{ name: "Civic" }, { name: "Pilot" }]);
  });

  it("returns empty list when make is blank", async () => {
    const models = await fetchModelsForMakeYear("  ", 2020);
    expect(models).toEqual([]);
  });
});
