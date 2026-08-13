import { describe, expect, it } from "vitest";
import {
  isValidFreeManualUrl,
  isValidPaidProviderManualUrl,
  readManualUrl,
  readPaidProviderManualUrl,
} from "@/lib/manuals/validateUrl";

describe("isValidFreeManualUrl", () => {
  it("accepts https OEM PDF links", () => {
    expect(
      isValidFreeManualUrl(
        "https://owners.honda.com/assets/ownerlink/model/own_man/2002accord.pdf",
      ),
    ).toBe(true);
  });

  it("accepts Rivian owner guide PDFs", () => {
    expect(
      isValidFreeManualUrl(
        "https://assets.rivian.com/2md5qhoeajym/4Xt9HvcwTmmMP9aKpJNg4k/964db4f5ee1785fa303ec4fecadfe691/r1t-og-my25-en-us-20240722.pdf",
        { make: "Rivian", model: "R1T" },
      ),
    ).toBe(true);
  });

  it("accepts Rivian support article pages", () => {
    expect(
      isValidFreeManualUrl("https://rivian.com/support/article/r1t-owners-guide", {
        make: "Rivian",
        model: "R1T",
      }),
    ).toBe(true);
  });

  it("accepts motorcycle manuals on make-matched domains", () => {
    expect(
      isValidFreeManualUrl(
        "https://www.harley-davidson.com/us/en/ownership/service-manual.html",
        { make: "Harley-Davidson" },
      ),
    ).toBe(true);
  });

  it("accepts snowmobile manuals on make-matched domains", () => {
    expect(
      isValidFreeManualUrl("https://www.polaris.com/en-us/owner-resources/manuals/", {
        make: "Polaris",
      }),
    ).toBe(true);
  });

  it("accepts RV manuals on make-matched domains", () => {
    expect(
      isValidFreeManualUrl("https://www.winnebago.com/Files/Files/Winnebago/Manuals/manual.pdf", {
        make: "Winnebago",
      }),
    ).toBe(true);
  });

  it("accepts boat manuals on make-matched domains", () => {
    expect(
      isValidFreeManualUrl(
        "https://www.bostonwhaler.com/ownership/owners-manuals",
        { make: "Boston Whaler" },
      ),
    ).toBe(true);
  });

  it("rejects non-https links", () => {
    expect(isValidFreeManualUrl("http://owners.honda.com/manual.pdf")).toBe(false);
  });

  it("rejects unknown hosts", () => {
    expect(isValidFreeManualUrl("https://example.com/manual.pdf")).toBe(false);
  });

  it("rejects impostor domains that substring-match OEM names", () => {
    expect(
      isValidFreeManualUrl("https://notrivian.com/support/article/r1t-owners-guide"),
    ).toBe(false);
    expect(
      isValidFreeManualUrl("https://candy.com/owner-manual.pdf", {
        make: "Can-Am",
      }),
    ).toBe(false);
    expect(
      isValidFreeManualUrl("https://stanford.edu/manual.pdf", { make: "Ford" }),
    ).toBe(false);
  });

  it("rejects search-engine result pages", () => {
    expect(
      isValidFreeManualUrl("https://www.google.com/search?q=rivian+r1t+manual+pdf"),
    ).toBe(false);
  });
});

describe("isValidPaidProviderManualUrl", () => {
  it("accepts known paid-provider CDN paths", () => {
    expect(
      isValidPaidProviderManualUrl(
        "https://vhr.nyc3.cdn.digitaloceanspaces.com/owners-manual/acura/manual.pdf",
      ),
    ).toBe(true);
  });
});

describe("readManualUrl", () => {
  it("returns null for invalid values", () => {
    expect(readManualUrl(null)).toBeNull();
    expect(readManualUrl("not-a-url")).toBeNull();
  });

  it("uses make context for newer OEM domains", () => {
    expect(
      readManualUrl("https://rivian.com/support/article/r1t-owners-guide", {
        make: "Rivian",
      }),
    ).toBe("https://rivian.com/support/article/r1t-owners-guide");
  });
});

describe("readPaidProviderManualUrl", () => {
  it("returns null for generic pdf hosts", () => {
    expect(readPaidProviderManualUrl("https://example.com/manual.pdf")).toBeNull();
  });
});
