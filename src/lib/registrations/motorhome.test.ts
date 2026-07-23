import { describe, expect, it } from "vitest";
import {
  formatMotorhomeClass,
  isValidMotorhomeClass,
} from "@/lib/registrations/motorhome";

describe("motorhome class", () => {
  it("validates A/B/C", () => {
    expect(isValidMotorhomeClass("A")).toBe(true);
    expect(isValidMotorhomeClass("B")).toBe(true);
    expect(isValidMotorhomeClass("C")).toBe(true);
    expect(isValidMotorhomeClass("D")).toBe(false);
    expect(isValidMotorhomeClass("")).toBe(false);
  });

  it("formats labels", () => {
    expect(formatMotorhomeClass("A")).toBe("Class A (bus-style)");
    expect(formatMotorhomeClass(null)).toBeNull();
  });
});
