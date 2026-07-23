import { describe, expect, it } from "vitest";
import { isRegistrationDocumentImageFilename } from "@/lib/registrations/photo";

describe("isRegistrationDocumentImageFilename", () => {
  it("accepts common registration scan image extensions", () => {
    expect(isRegistrationDocumentImageFilename("registration.jpg")).toBe(true);
    expect(isRegistrationDocumentImageFilename("scan.JPEG")).toBe(true);
    expect(isRegistrationDocumentImageFilename("card.heic")).toBe(true);
  });

  it("rejects PDFs and unknown extensions", () => {
    expect(isRegistrationDocumentImageFilename("registration.pdf")).toBe(false);
    expect(isRegistrationDocumentImageFilename("notes.txt")).toBe(false);
  });
});
