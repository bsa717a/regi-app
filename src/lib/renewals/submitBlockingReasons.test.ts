import { describe, expect, it } from "vitest";
import {
  getSubmitBlockingReasons,
  isSubmitRenewalBlocked,
  submitDisabledTitle,
} from "./submitBlockingReasons";

const ready = {
  emailVerified: true,
  documentsComplete: true,
  needsCounty: false,
  countySelected: false,
  missingDocumentLabels: [] as string[],
};

describe("getSubmitBlockingReasons", () => {
  it("returns no reasons when submit is allowed", () => {
    expect(getSubmitBlockingReasons(ready)).toEqual([]);
    expect(isSubmitRenewalBlocked(ready)).toBe(false);
    expect(submitDisabledTitle([])).toBeUndefined();
  });

  it("asks to verify email first", () => {
    expect(
      getSubmitBlockingReasons({ ...ready, emailVerified: false }),
    ).toEqual([{ key: "email", message: "Verify your email first" }]);
  });

  it("names a single missing document, including emissions", () => {
    expect(
      getSubmitBlockingReasons({
        ...ready,
        documentsComplete: false,
        missingDocumentLabels: ["Emissions certificate"],
      }),
    ).toEqual([{ key: "docs", message: "Missing Emissions certificate" }]);
  });

  it("lists multiple missing documents", () => {
    expect(
      getSubmitBlockingReasons({
        ...ready,
        documentsComplete: false,
        missingDocumentLabels: ["Registration card", "Insurance"],
      }),
    ).toEqual([
      {
        key: "docs",
        message: "Missing documents: Registration card, Insurance",
      },
    ]);
  });

  it("falls back when documents are incomplete but unlabeled", () => {
    expect(
      getSubmitBlockingReasons({
        ...ready,
        documentsComplete: false,
        missingDocumentLabels: [],
      }),
    ).toEqual([{ key: "docs", message: "Upload required documents" }]);
  });

  it("requires a county when emissions rules depend on it", () => {
    expect(
      getSubmitBlockingReasons({
        ...ready,
        needsCounty: true,
        countySelected: false,
      }),
    ).toEqual([{ key: "county", message: "Select a registration county" }]);
  });

  it("does not block after a county is selected", () => {
    expect(
      getSubmitBlockingReasons({
        ...ready,
        needsCounty: true,
        countySelected: true,
      }),
    ).toEqual([]);
  });

  it("stacks email, documents, and county reasons", () => {
    const reasons = getSubmitBlockingReasons({
      emailVerified: false,
      documentsComplete: false,
      needsCounty: true,
      countySelected: false,
      missingDocumentLabels: ["Emissions certificate"],
    });

    expect(reasons.map((reason) => reason.key)).toEqual([
      "email",
      "docs",
      "county",
    ]);
    expect(isSubmitRenewalBlocked({
      emailVerified: false,
      documentsComplete: false,
      needsCounty: true,
      countySelected: false,
      missingDocumentLabels: ["Emissions certificate"],
    })).toBe(true);
    expect(submitDisabledTitle(reasons)).toBe(
      "Submit is disabled: Verify your email first; Missing Emissions certificate; Select a registration county",
    );
  });
});
