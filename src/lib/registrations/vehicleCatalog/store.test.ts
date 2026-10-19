import { describe, expect, it } from "vitest";
import {
  catalogGcsPath,
  isSafeCatalogId,
  resolveLocalCatalogPath,
} from "@/lib/registrations/vehicleCatalog/store";

describe("catalog storage paths", () => {
  it("only accepts our ids and stays inside the local catalog directory", () => {
    expect(isSafeCatalogId("caccord2003aaaa")).toBe(true);
    expect(isSafeCatalogId("../etc/passwd")).toBe(false);
    expect(isSafeCatalogId("cshort")).toBe(false);
    expect(catalogGcsPath("caccord2003aaaa")).toBe(
      "catalog/vehicles/caccord2003aaaa.webp",
    );
    expect(resolveLocalCatalogPath("/tmp/not-ours.webp")).toBeNull();
    expect(
      resolveLocalCatalogPath(
        `${process.cwd()}/data/vehicle-catalog/../secret.webp`,
      ),
    ).toBeNull();
  });
});
