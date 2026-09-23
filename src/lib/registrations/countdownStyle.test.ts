import { describe, expect, it } from "vitest";
import { expirationCountdownClassName } from "@/lib/registrations/countdownStyle";

describe("expirationCountdownClassName", () => {
  it("uses the expired status token", () => {
    expect(expirationCountdownClassName("Expired")).toContain("text-regi-expired");
  });

  it("uses the due status token", () => {
    expect(expirationCountdownClassName("Due Soon")).toContain("text-regi-due");
  });

  it("uses the current status token", () => {
    expect(expirationCountdownClassName("Current")).toContain("text-regi-current");
  });
});
