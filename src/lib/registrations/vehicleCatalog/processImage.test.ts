import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { toCatalogWebp } from "@/lib/registrations/vehicleCatalog/processImage";

describe("toCatalogWebp", () => {
  it("encodes a raster as WebP", async () => {
    const png = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: { r: 180, g: 190, b: 200 },
      },
    })
      .png()
      .toBuffer();
    const webp = await toCatalogWebp(png);
    expect(webp.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(webp.subarray(8, 12).toString("ascii")).toBe("WEBP");
  });
});
