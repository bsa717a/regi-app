/** Tiny valid PDF for vault / concierge uploads (skips the image enhance preview). */
export const E2E_PDF_BYTES = Buffer.from(
  `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R>>endobj
trailer<</Root 1 0 R>>
%%EOF`,
  "utf8",
);

export function e2ePdfPayload(filename: string) {
  return {
    name: filename,
    mimeType: "application/pdf" as const,
    buffer: E2E_PDF_BYTES,
  };
}
