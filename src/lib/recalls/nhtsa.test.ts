import { describe, expect, it, vi } from "vitest";
import {
  fetchRecallsByVehicle,
  parseNhtsaRecallRow,
  parseNhtsaRecallsResponse,
} from "./nhtsa";

describe("parseNhtsaRecallRow", () => {
  it("parses a real NHTSA-shaped row", () => {
    const row = parseNhtsaRecallRow({
      NHTSACampaignNumber: "23V458000",
      Manufacturer: "Honda (American Honda Motor Co.)",
      Component: "SERVICE BRAKES, HYDRAULIC:FOUNDATION COMPONENTS:MASTER CYLINDER",
      Summary: "Honda is recalling certain vehicles.",
      Consequence: "Brake master cylinder separation can cause a loss of brake function.",
      Remedy: "Dealers will inspect and repair the brake booster assembly.",
      Notes: "Owners may contact Honda customer service.",
      ReportReceivedDate: "29/06/2023",
      parkIt: false,
      parkOutSide: false,
      overTheAirUpdate: false,
    });

    expect(row).toEqual({
      nhtsaCampaignNumber: "23V458000",
      manufacturer: "Honda (American Honda Motor Co.)",
      component:
        "SERVICE BRAKES, HYDRAULIC:FOUNDATION COMPONENTS:MASTER CYLINDER",
      summary: "Honda is recalling certain vehicles.",
      consequence:
        "Brake master cylinder separation can cause a loss of brake function.",
      remedy: "Dealers will inspect and repair the brake booster assembly.",
      notesFromNhtsa: "Owners may contact Honda customer service.",
      reportReceivedDate: "29/06/2023",
      parkIt: false,
      parkOutside: false,
      overTheAirUpdate: false,
    });
  });

  it("returns null when campaign number is missing", () => {
    expect(parseNhtsaRecallRow({ Component: "AIR BAGS" })).toBeNull();
  });

  it("reads park flags", () => {
    const row = parseNhtsaRecallRow({
      NHTSACampaignNumber: "99V001",
      parkIt: true,
      parkOutSide: true,
      overTheAirUpdate: true,
    });
    expect(row?.parkIt).toBe(true);
    expect(row?.parkOutside).toBe(true);
    expect(row?.overTheAirUpdate).toBe(true);
  });
});

describe("parseNhtsaRecallsResponse", () => {
  it("returns empty array when Count is 0", () => {
    expect(parseNhtsaRecallsResponse({ Count: 0, results: [] })).toEqual([]);
  });

  it("skips rows without campaign numbers", () => {
    const parsed = parseNhtsaRecallsResponse({
      Count: 2,
      results: [
        { NHTSACampaignNumber: "21V215000", Component: "FUEL SYSTEM" },
        { Component: "AIR BAGS" },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.nhtsaCampaignNumber).toBe("21V215000");
  });
});

describe("fetchRecallsByVehicle", () => {
  it("treats Count 0 as success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Count: 0, Message: "Results returned successfully", results: [] }),
    });

    const result = await fetchRecallsByVehicle(2020, "Honda", "Civic", {
      fetchImpl,
    });

    expect(result).toEqual({ ok: true, recalls: [] });
  });

  it("returns error on HTTP failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await fetchRecallsByVehicle(2020, "Honda", "Civic", {
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("unavailable");
    }
  });
});
