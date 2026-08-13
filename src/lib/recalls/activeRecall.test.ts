import { describe, expect, it } from "vitest";
import { isActiveOpenRecall } from "./activeRecall";

describe("isActiveOpenRecall", () => {
  const checkedAt = new Date("2026-08-13T12:00:00.000Z");

  it("returns true for open recalls seen in the latest sync", () => {
    expect(
      isActiveOpenRecall(
        { status: "open", lastSeenAt: checkedAt },
        checkedAt,
      ),
    ).toBe(true);
  });

  it("returns false for open recalls missing from the latest sync", () => {
    expect(
      isActiveOpenRecall(
        { status: "open", lastSeenAt: new Date("2026-01-01T00:00:00.000Z") },
        checkedAt,
      ),
    ).toBe(false);
  });

  it("returns false when never checked or not open", () => {
    expect(
      isActiveOpenRecall(
        { status: "completed", lastSeenAt: checkedAt },
        checkedAt,
      ),
    ).toBe(false);
    expect(
      isActiveOpenRecall({ status: "open", lastSeenAt: checkedAt }, null),
    ).toBe(false);
  });
});
