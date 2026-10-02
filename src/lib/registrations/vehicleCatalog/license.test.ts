import { describe, expect, it } from "vitest";
import { parseFreeLicense, plainText } from "@/lib/registrations/vehicleCatalog/license";

describe("parseFreeLicense", () => {
  it("accepts CC BY, CC BY-SA, CC0, and public domain", () => {
    expect(parseFreeLicense("CC BY 2.5")?.name).toBe("CC BY 2.5");
    expect(parseFreeLicense("CC BY-SA 4.0")).toMatchObject({
      name: "CC BY-SA 4.0",
      shareAlike: true,
    });
    expect(parseFreeLicense("CC0 1.0")?.name).toBe("CC0");
    expect(parseFreeLicense("Public domain")).toMatchObject({
      name: "Public domain",
      shareAlike: false,
    });
    expect(
      parseFreeLicense("Creative Commons Attribution-Share Alike 4.0"),
    ).toMatchObject({ shareAlike: true, name: "CC BY-SA 4.0" });
  });

  it("rejects non-commercial, no-derivatives, and missing terms", () => {
    expect(parseFreeLicense("CC BY-NC 4.0")).toBeNull();
    expect(parseFreeLicense("CC BY-NC-SA 4.0")).toBeNull();
    expect(parseFreeLicense("CC BY-ND 4.0")).toBeNull();
    expect(parseFreeLicense("GFDL")).toBeNull();
    expect(parseFreeLicense("All rights reserved")).toBeNull();
    expect(parseFreeLicense("")).toBeNull();
    expect(parseFreeLicense(null)).toBeNull();
  });

  it("strips html from attribution text", () => {
    expect(plainText('<a href="//commons.wikimedia.org/wiki/User:IFCAR">IFCAR</a>')).toBe(
      "IFCAR",
    );
  });
});
