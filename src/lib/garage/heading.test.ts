import { describe, expect, it } from "vitest";
import { pageTitle } from "@/lib/seo/pageTitle";
import { GARAGE_PAGE_HEADING, garageHeading } from "@/lib/garage/heading";

describe("garageHeading", () => {
  it("uses the first name with a possessive", () => {
    expect(garageHeading("Derek")).toBe("Derek's Garage");
    expect(garageHeading("Derek Fowler")).toBe("Derek's Garage");
    expect(garageHeading("  Derek   Fowler  ")).toBe("Derek's Garage");
  });

  it("uses a bare apostrophe when the first name ends in s", () => {
    expect(garageHeading("James")).toBe("James' Garage");
    expect(garageHeading("James Smith")).toBe("James' Garage");
    expect(garageHeading("Chris")).toBe("Chris' Garage");
    expect(garageHeading("JAMES")).toBe("JAMES' Garage");
  });

  it("falls back to Your Garage when no first name is on file", () => {
    expect(garageHeading(null)).toBe("Your Garage");
    expect(garageHeading(undefined)).toBe("Your Garage");
    expect(garageHeading("")).toBe("Your Garage");
    expect(garageHeading("   ")).toBe("Your Garage");
    expect(garageHeading("\n\t")).toBe("Your Garage");
  });

  it("keeps an apostrophe that is already inside the first name", () => {
    expect(garageHeading("O'Brien")).toBe("O'Brien's Garage");
  });

  it("matches the tab title to the header", () => {
    expect(pageTitle(garageHeading("Derek Fowler"))).toBe("Derek's Garage · REGI");
    expect(pageTitle(garageHeading("James"))).toBe("James' Garage · REGI");
    expect(pageTitle(garageHeading(null))).toBe("Your Garage · REGI");
  });

  it("does not treat the empty-state sentence as the page heading", () => {
    expect(garageHeading("Derek")).toMatch(GARAGE_PAGE_HEADING);
    expect(garageHeading("James")).toMatch(GARAGE_PAGE_HEADING);
    expect(garageHeading(null)).toMatch(GARAGE_PAGE_HEADING);
    expect("Garage").toMatch(GARAGE_PAGE_HEADING);
    expect("Your garage is empty").not.toMatch(GARAGE_PAGE_HEADING);
  });
});
