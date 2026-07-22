import { describe, expect, it } from "vitest";
import type { Document } from "@prisma/client";
import { mergeDocumentsForRenewal, vaultDocumentsToAttach } from "./vaultDocs";

function doc(
  overrides: Partial<Document> & Pick<Document, "id" | "type" | "renewalId">,
): Document {
  return {
    vehicleId: "veh-1",
    gcsPath: "path",
    originalFilename: "f.pdf",
    uploadedBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  } as Document;
}

describe("mergeDocumentsForRenewal", () => {
  it("includes vault docs with null renewalId", () => {
    const renewalDocs = [
      doc({
        id: "r1",
        type: "registration",
        renewalId: "ren-1",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
      }),
    ];
    const vault = [
      doc({
        id: "v1",
        type: "insurance",
        renewalId: null,
        createdAt: new Date("2026-07-03T00:00:00.000Z"),
      }),
    ];
    const merged = mergeDocumentsForRenewal("ren-1", renewalDocs, vault);
    expect(merged.map((d) => d.id).sort()).toEqual(["r1", "v1"]);
  });

  it("does not duplicate ids", () => {
    const shared = doc({
      id: "same",
      type: "title",
      renewalId: "ren-1",
    });
    const merged = mergeDocumentsForRenewal("ren-1", [shared], [shared]);
    expect(merged).toHaveLength(1);
  });
});

describe("vaultDocumentsToAttach", () => {
  it("returns only docs with null renewalId", () => {
    const docs = [
      doc({ id: "a", type: "registration", renewalId: "ren-1" }),
      doc({ id: "b", type: "insurance", renewalId: null }),
    ];
    expect(vaultDocumentsToAttach(docs).map((d) => d.id)).toEqual(["b"]);
  });
});
