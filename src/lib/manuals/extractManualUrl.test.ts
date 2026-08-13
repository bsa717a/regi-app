import { describe, expect, it } from "vitest";
import {
  extractHttpsUrls,
  pickBestManualUrl,
} from "@/lib/manuals/extractManualUrl";

describe("extractHttpsUrls", () => {
  it("pulls https links from mixed text", () => {
    expect(
      extractHttpsUrls(
        'Try {"url":"https://rivian.com/support/article/r1t-owners-guide"} or https://assets.rivian.com/manual.pdf',
      ),
    ).toEqual([
      "https://rivian.com/support/article/r1t-owners-guide",
      "https://assets.rivian.com/manual.pdf",
    ]);
  });
});

describe("pickBestManualUrl", () => {
  it("prefers validated pdf links for the make", () => {
    expect(
      pickBestManualUrl(
        [
          "https://www.google.com/search?q=rivian+manual",
          "https://assets.rivian.com/2md5qhoeajym/manual.pdf",
          "https://rivian.com/support/article/r1t-owners-guide",
        ],
        { make: "Rivian", model: "R1T" },
      ),
    ).toBe("https://assets.rivian.com/2md5qhoeajym/manual.pdf");
  });
});
