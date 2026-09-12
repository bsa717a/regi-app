import { describe, expect, it } from "vitest";
import {
  isLocalPlaywrightHost,
  isProductionPlaywrightHost,
  ProductionE2eTargetError,
  resolvePlaywrightBaseURL,
  STAGING_ORIGIN,
} from "./stagingTarget";

describe("staging Playwright target guard", () => {
  it("defaults to durable staging Cloud Run", () => {
    expect(resolvePlaywrightBaseURL(undefined)).toBe(STAGING_ORIGIN);
    expect(resolvePlaywrightBaseURL("")).toBe(STAGING_ORIGIN);
    expect(resolvePlaywrightBaseURL("  ")).toBe(STAGING_ORIGIN);
  });

  it("accepts staging and localhost", () => {
    expect(resolvePlaywrightBaseURL(STAGING_ORIGIN)).toBe(STAGING_ORIGIN);
    expect(resolvePlaywrightBaseURL("http://127.0.0.1:8080/garage")).toBe(
      "http://127.0.0.1:8080",
    );
    expect(isLocalPlaywrightHost("localhost")).toBe(true);
    expect(isProductionPlaywrightHost("regi-staging-90502049802.us-central1.run.app")).toBe(
      false,
    );
  });

  it("refuses production hosts", () => {
    const forbidden = [
      "https://app.regireg.com",
      "https://www.regireg.com",
      "https://regi-90502049802.us-central1.run.app",
      "https://regi-app-v1.web.app",
    ];
    for (const url of forbidden) {
      expect(() => resolvePlaywrightBaseURL(url)).toThrow(ProductionE2eTargetError);
    }
    expect(isProductionPlaywrightHost("app.regireg.com")).toBe(true);
    expect(
      isProductionPlaywrightHost("regi-90502049802.us-central1.run.app"),
    ).toBe(true);
  });
});
