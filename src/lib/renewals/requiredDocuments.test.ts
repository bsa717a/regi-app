import { describe, expect, it } from "vitest";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import {
  buildRequiredDocumentStatus,
  checkRequiredDocumentsComplete,
  documentApplies,
  getApplicableRequiredDocuments,
} from "./requiredDocuments";

const utahLikeConfig: StateRulesConfig = {
  displayName: "Utah",
  requiredDocuments: [
    {
      type: "registration",
      label: "Registration card",
      required: true,
      applicability: { kind: "always" },
    },
    {
      type: "insurance",
      label: "Insurance",
      required: true,
      applicability: { kind: "always" },
    },
    {
      type: "emissions",
      label: "Emissions certificate",
      required: true,
      applicability: {
        kind: "county_list",
        counties: ["Salt Lake", "Davis", "Utah"],
      },
    },
    {
      type: "title",
      label: "Title (optional)",
      required: false,
      applicability: { kind: "always" },
    },
  ],
  renewalWindow: {
    daysBeforeExpirationOpen: 90,
    lateFeeStartsAfterDays: 0,
    expirationConvention: "eom",
    dueSoonThresholdDays: 60,
  },
  fees: {
    currency: "USD",
    registrationFeeCents: 1,
    lateFeeCents: 1,
    regiServiceFeeCents: 1,
  },
  reminderSchedule: {
    daysBeforeExpiration: [30],
    postExpiration: { intervalDays: 3 },
  },
  conciergeWorkflow: [],
  registrationTypes: [],
};

describe("documentApplies", () => {
  it("always applies for kind always", () => {
    expect(documentApplies({ kind: "always" }, null)).toBe(true);
  });

  it("county_list matches case-insensitively", () => {
    expect(
      documentApplies(
        { kind: "county_list", counties: ["Salt Lake"] },
        "salt lake",
      ),
    ).toBe(true);
    expect(
      documentApplies(
        { kind: "county_list", counties: ["Salt Lake"] },
        "Cache",
      ),
    ).toBe(false);
  });

  it("county_list is conservative when county unknown", () => {
    expect(
      documentApplies({ kind: "county_list", counties: ["Salt Lake"] }, null),
    ).toBe(true);
  });

  it("county_exclude skips listed counties", () => {
    expect(
      documentApplies(
        { kind: "county_exclude", counties: ["Rural"] },
        "Rural",
      ),
    ).toBe(false);
    expect(
      documentApplies(
        { kind: "county_exclude", counties: ["Rural"] },
        "Salt Lake",
      ),
    ).toBe(true);
  });
});

describe("checkRequiredDocumentsComplete", () => {
  it("requires registration + insurance always; emissions only in listed counties", () => {
    const inCounty = getApplicableRequiredDocuments(
      utahLikeConfig,
      "Salt Lake",
    );
    expect(inCounty.map((r) => r.type)).toEqual([
      "registration",
      "insurance",
      "emissions",
    ]);

    const outOfCounty = getApplicableRequiredDocuments(
      utahLikeConfig,
      "San Juan",
    );
    expect(outOfCounty.map((r) => r.type)).toEqual([
      "registration",
      "insurance",
    ]);
  });

  it("is incomplete until all applicable types are uploaded", () => {
    const incomplete = checkRequiredDocumentsComplete(
      utahLikeConfig,
      ["registration"],
      "Davis",
    );
    expect(incomplete.complete).toBe(false);
    expect(incomplete.missingTypes).toEqual(["insurance", "emissions"]);

    const complete = checkRequiredDocumentsComplete(
      utahLikeConfig,
      ["registration", "insurance", "emissions"],
      "Davis",
    );
    expect(complete.complete).toBe(true);
    expect(complete.missingTypes).toEqual([]);
  });

  it("does not require emissions outside county_list", () => {
    const result = checkRequiredDocumentsComplete(
      utahLikeConfig,
      ["registration", "insurance"],
      "Other",
    );
    expect(result.complete).toBe(true);
  });

  it("buildRequiredDocumentStatus attaches document ids", () => {
    const result = buildRequiredDocumentStatus(
      utahLikeConfig,
      [
        { id: "d1", type: "registration" },
        { id: "d2", type: "insurance" },
      ],
      "San Juan",
    );
    expect(result.complete).toBe(true);
    expect(result.required.find((r) => r.type === "registration")?.documentIds).toEqual([
      "d1",
    ]);
  });
});
