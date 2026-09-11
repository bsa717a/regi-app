export type PreviewKind = "image" | "pdf" | "other";

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|gif|bmp|tif?f)$/i;
const PDF_EXT = /\.pdf$/i;

function pathFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed, "https://preview.invalid").pathname;
  } catch {
    return trimmed;
  }
}

export function inferPreviewKind(input: {
  filename?: string | null;
  url?: string | null;
  kind?: PreviewKind | null;
}): PreviewKind {
  if (input.kind) return input.kind;

  const filename = input.filename?.trim() ?? "";
  if (PDF_EXT.test(filename)) return "pdf";
  if (IMAGE_EXT.test(filename)) return "image";

  const url = input.url?.trim() ?? "";
  if (url.startsWith("data:image/")) return "image";
  if (url.startsWith("data:application/pdf")) return "pdf";

  const path = pathFromUrl(url);
  if (PDF_EXT.test(path)) return "pdf";
  if (IMAGE_EXT.test(path)) return "image";

  return "other";
}
