import { describe, expect, it } from "vitest";
import { inferPreviewKind } from "@/lib/documents/previewKind";

describe("inferPreviewKind", () => {
  it("honors an explicit kind override", () => {
    expect(
      inferPreviewKind({
        filename: "notes.txt",
        kind: "image",
      }),
    ).toBe("image");
  });

  it("detects images and PDFs from filename", () => {
    expect(inferPreviewKind({ filename: "card.JPEG" })).toBe("image");
    expect(inferPreviewKind({ filename: "scan.heic" })).toBe("image");
    expect(inferPreviewKind({ filename: "title.pdf" })).toBe("pdf");
  });

  it("detects kind from a URL path when the filename has no extension", () => {
    expect(
      inferPreviewKind({
        filename: "Garage photo",
        url: "https://storage.example/photos/cover.webp?token=1",
      }),
    ).toBe("image");
    expect(
      inferPreviewKind({
        filename: "Manual",
        url: "https://cdn.example/manuals/owners-manual.pdf",
      }),
    ).toBe("pdf");
  });

  it("treats data URLs as their MIME kind", () => {
    expect(inferPreviewKind({ url: "data:image/png;base64,aaa" })).toBe("image");
    expect(inferPreviewKind({ url: "data:application/pdf;base64,aaa" })).toBe(
      "pdf",
    );
  });

  it("falls back to other when nothing matches", () => {
    expect(inferPreviewKind({ filename: "receipt", url: "blob:https://app/1" })).toBe(
      "other",
    );
  });
});
