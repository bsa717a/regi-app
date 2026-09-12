import { describe, expect, it } from "vitest";
import { estimateUtahPersonalizedPlateFees } from "./fees";

describe("estimateUtahPersonalizedPlateFees", () => {
  it("estimates $50 application + $25 processing for a new plate", () => {
    const fees = estimateUtahPersonalizedPlateFees();

    expect(fees.isEstimate).toBe(true);
    expect(fees.applicationFeeCents).toBe(5000);
    expect(fees.processingFeeCents).toBe(2500);
    expect(fees.initialTotalCents).toBe(7500);
    expect(fees.renewalFeeCents).toBe(1000);
    expect(fees.specialGroupNote).toBeNull();
    expect(fees.disclaimer).toMatch(/estimates only/i);
    expect(fees.disclaimer).toMatch(/does not mean/i);
  });

  it("adds a special-group contribution disclaimer without inventing an amount", () => {
    const fees = estimateUtahPersonalizedPlateFees({ specialGroup: true });
    expect(fees.initialTotalCents).toBe(7500);
    expect(fees.specialGroupNote).toMatch(/not included/i);
    expect(fees.specialGroupNote).toMatch(/MVP/i);
  });

  it("keeps the $10 renewal as an estimate separate from the initial total", () => {
    const fees = estimateUtahPersonalizedPlateFees();
    expect(fees.renewalFeeCents).toBe(1000);
    expect(fees.initialTotalCents).not.toBe(
      fees.applicationFeeCents +
        fees.processingFeeCents +
        fees.renewalFeeCents,
    );
  });
});
