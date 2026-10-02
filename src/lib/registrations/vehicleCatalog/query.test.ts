import { describe, expect, it } from "vitest";
import { parseCatalogQuery } from "@/lib/registrations/vehicleCatalog/query";

describe("parseCatalogQuery", () => {
  it("accepts a year make and model and rejects junk", () => {
    expect(parseCatalogQuery({ year: 2003, make: "Honda", model: "Accord" })).toEqual({
      year: 2003,
      make: "Honda",
      model: "Accord",
    });
    expect(parseCatalogQuery({ year: 1800, make: "Honda", model: "Accord" })).toBeNull();
    expect(parseCatalogQuery({ year: 2003, make: "Honda", model: "" })).toBeNull();
    expect(parseCatalogQuery({ year: 2003, make: "Hon\nda", model: "Accord" })).toBeNull();
  });
});
