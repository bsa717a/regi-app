const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
/** Raw bytes before base64 encoding (~4/3 expansion must stay under server cap). */
const MAX_RAW_BYTES = 7 * 1024 * 1024;
export const MAX_SCAN_BASE64_CHARS = 10 * 1024 * 1024;

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export type PreparedScanImage = {
  file: File;
  base64: string;
  mimeType: string;
};

function inferImageContentType(file: File): string | null {
  const typed = file.type.trim().toLowerCase();
  if (typed.startsWith("image/")) return typed;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_CONTENT_TYPE[ext] ?? null;
}

function assertBase64WithinLimit(base64: string): void {
  if (base64.length > MAX_SCAN_BASE64_CHARS) {
    throw new Error("Image is too large. Try a smaller photo.");
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file"));
      }
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image"));
    image.src = dataUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress image"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

async function compressWithCanvas(file: File): Promise<PreparedScanImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(dataUrl);

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare image");
  }
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await canvasToJpegBlob(canvas);
  const compressed = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, "") + ".jpg",
    { type: "image/jpeg", lastModified: Date.now() },
  );

  const compressedDataUrl = await readFileAsDataUrl(compressed);
  const base64 = dataUrlToBase64(compressedDataUrl);
  assertBase64WithinLimit(base64);
  return {
    file: compressed,
    base64,
    mimeType: "image/jpeg",
  };
}

async function prepareRawFile(file: File, mimeType: string): Promise<PreparedScanImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const base64 = dataUrlToBase64(dataUrl);
  assertBase64WithinLimit(base64);
  return {
    file,
    base64,
    mimeType,
  };
}

/** Downscale and JPEG-compress when possible; otherwise send the raw file within size limits. */
export async function prepareScanImage(file: File): Promise<PreparedScanImage> {
  if (file.size > MAX_RAW_BYTES) {
    throw new Error("Image is too large. Try a smaller photo.");
  }

  try {
    return await compressWithCanvas(file);
  } catch {
    const mimeType = inferImageContentType(file);
    if (!mimeType) {
      throw new Error("Unsupported image type.");
    }
    return prepareRawFile(file, mimeType);
  }
}
