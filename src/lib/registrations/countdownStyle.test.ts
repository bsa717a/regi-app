import { describe, expect, it } from "vitest";
import { expirationCountdownClassName } from "@/lib/registrations/countdownStyle";

describe("expirationCountdownClassName", () => {
  it("uses rose for Expired", () => {
    expect(expirationCountdownClassName("Expired")).toContain("text-rose-700");
  });

  it("uses amber for Due Soon", () => {
    expect(expirationCountdownClassName("Due Soon")).toContain(
      "text-amber-800",
    );
  });

  it("uses teal for Current", () => {
    expect(expirationCountdownClassName("Current")).toContain("text-teal-800");
  });
});
