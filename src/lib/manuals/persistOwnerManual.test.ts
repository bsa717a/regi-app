import { describe, expect, it } from "vitest";
import { buildOwnerManualFilename } from "@/lib/manuals/persistOwnerManual";

describe("buildOwnerManualFilename", () => {
  it("builds a stable pdf filename from vehicle details", () => {
    expect(
      buildOwnerManualFilename({
        year: 2022,
        make: "TOYOTA",
        model: "RAV4",
      }),
    ).toBe("2022-toyota-rav4-owners-manual.pdf");
  });
});
