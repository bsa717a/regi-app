import { describe, expect, it } from "vitest";
import { utahVinLast4 } from "./vinLast4";

describe("utahVinLast4", () => {
  it("returns the last four characters of a VIN", () => {
    expect(utahVinLast4("1GNSKCKC8MR312456")).toBe("2456");
  });

  it("ignores spaces and dashes", () => {
    expect(utahVinLast4("1GNS-KCKC 8MR3 12456")).toBe("2456");
  });

  it("returns null when the VIN is missing or too short", () => {
    expect(utahVinLast4(null)).toBeNull();
    expect(utahVinLast4("")).toBeNull();
    expect(utahVinLast4("AB")).toBeNull();
  });
});
