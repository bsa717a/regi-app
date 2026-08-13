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

  it("rejects non-https links", () => {
    expect(isValidFreeManualUrl("http://owners.honda.com/manual.pdf")).toBe(false);
  });

  it("rejects unknown hosts", () => {
    expect(isValidFreeManualUrl("https://example.com/manual.pdf")).toBe(false);
  });

  it("rejects paid-provider CDN links", () => {
    expect(
      isValidFreeManualUrl(
        "https://vhr.nyc3.cdn.digitaloceanspaces.com/owners-manual/acura/manual.pdf",
      ),
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
});

describe("readPaidProviderManualUrl", () => {
  it("returns null for generic pdf hosts", () => {
    expect(readPaidProviderManualUrl("https://example.com/manual.pdf")).toBeNull();
  });
});
