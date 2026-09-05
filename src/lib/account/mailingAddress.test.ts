import { describe, expect, it } from "vitest";
import {
  formatMailingAddress,
  formatMailingAddressShort,
  parseMailingAddressPatch,
} from "./mailingAddress";

describe("parseMailingAddressPatch", () => {
  it("trims strings and uppercases state", () => {
    expect(
      parseMailingAddressPatch({
        addressLine1: "  123 Main St  ",
        addressLine2: "",
        city: " Salt Lake City ",
        addressState: "ut",
        postalCode: "84101",
      }),
    ).toEqual({
      ok: true,
      patch: {
        addressLine1: "123 Main St",
        addressLine2: null,
        city: "Salt Lake City",
        addressState: "UT",
        postalCode: "84101",
      },
    });
  });

  it("rejects invalid state and ZIP", () => {
    expect(parseMailingAddressPatch({ addressState: "XX" }).ok).toBe(false);
    expect(parseMailingAddressPatch({ postalCode: "8410" }).ok).toBe(false);
  });

  it("accepts ZIP+4", () => {
    expect(parseMailingAddressPatch({ postalCode: "84101-1234" })).toEqual({
      ok: true,
      patch: { postalCode: "84101-1234" },
    });
  });
});

describe("formatMailingAddress", () => {
  it("formats a full address and a short city/state", () => {
    const address = {
      addressLine1: "123 Main St",
      addressLine2: "Ste 4",
      city: "Salt Lake City",
      addressState: "UT",
      postalCode: "84101",
    };
    expect(formatMailingAddress(address)).toBe(
      "123 Main St, Ste 4, Salt Lake City, UT 84101",
    );
    expect(formatMailingAddressShort(address)).toBe("Salt Lake City, UT");
    expect(
      formatMailingAddressShort({
        addressLine1: null,
        addressLine2: null,
        city: null,
        addressState: null,
        postalCode: null,
      }),
    ).toBe("—");
  });
});
