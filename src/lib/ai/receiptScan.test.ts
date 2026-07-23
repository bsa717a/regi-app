import { describe, expect, it } from "vitest";
import { parseReceiptScanResponse } from "./receiptScan";

describe("parseReceiptScanResponse", () => {
  it("maps receipt fields into service log shape", () => {
    const result = parseReceiptScanResponse(
      JSON.stringify({
        performedOn: "2026-07-20",
        hoursAtService: 42.5,
        milesAtService: null,
        costDollars: 89.5,
        shopName: "Trailhead Motors",
        notes: "oil change",
        confidence: 0.9,
      }),
    );

    expect(result.performedOn).toBe("2026-07-20");
    expect(result.hoursAtService).toBe(42.5);
    expect(result.costDollars).toBe(89.5);
    expect(result.notes).toBe("Trailhead Motors: oil change");
    expect(result.confidence).toBe(0.9);
  });

  it("drops invalid numbers", () => {
    const result = parseReceiptScanResponse(
      JSON.stringify({
        performedOn: null,
        hoursAtService: -3,
        milesAtService: "nope",
        costDollars: null,
        shopName: null,
        notes: null,
        confidence: 2,
      }),
    );

    expect(result.hoursAtService).toBeNull();
    expect(result.milesAtService).toBeNull();
    expect(result.confidence).toBe(1);
  });
});
