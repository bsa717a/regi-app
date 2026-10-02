import sharp from "sharp";

const MAX_EDGE = 1280;

/**
 * Turn a downloaded photo into a WebP that fits a garage card.
 * Outdoor backgrounds stay; we only scale and encode. There is no
 * background-removal model in this app, and we do not call a paid one.
 */
export async function toCatalogWebp(bytes: Buffer): Promise<Buffer> {
  const webp = await sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: 720,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
  if (webp.length < 32) {
    throw new Error("Encoded vehicle photo was empty");
  }
  return webp;
}
