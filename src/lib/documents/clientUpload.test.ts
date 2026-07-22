import { describe, expect, it } from "vitest";
import { inferContentType, validateUploadFile } from "@/lib/documents/clientUpload";

describe("client upload helpers", () => {
  it("infers content type from extension when browser omits type", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "scan.heic", {
      type: "",
    });
    expect(inferContentType(file)).toBe("image/heic");
  });

  it("rejects oversized or wrong-type files before requesting a URL", () => {
    const bad = new File(["hello"], "notes.txt", { type: "text/plain" });
    expect(validateUploadFile(bad).ok).toBe(false);

    const good = new File([new Uint8Array([1])], "card.jpg", {
      type: "image/jpeg",
    });
    expect(validateUploadFile(good)).toEqual({
      ok: true,
      contentType: "image/jpeg",
    });
  });
});
