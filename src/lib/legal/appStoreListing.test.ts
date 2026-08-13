import { describe, expect, it } from "vitest";
import { APP_STORE_LISTING } from "@/lib/legal/appStoreListing";
import {
  PRIVACY_PATH,
  SUPPORT_PATH,
  TERMS_PATH,
  productionUrl,
} from "@/lib/legal/constants";

describe("App Store listing copy", () => {
  it("stays within App Store Connect field limits", () => {
    expect(APP_STORE_LISTING.name.length).toBeLessThanOrEqual(30);
    expect(APP_STORE_LISTING.subtitle.length).toBeLessThanOrEqual(30);
    expect(APP_STORE_LISTING.keywords.length).toBeLessThanOrEqual(100);
    expect(APP_STORE_LISTING.promotionalText.length).toBeLessThanOrEqual(170);
    expect(APP_STORE_LISTING.description.length).toBeLessThanOrEqual(4000);
    expect(APP_STORE_LISTING.whatsNew.length).toBeLessThanOrEqual(4000);
  });

  it("points Connect URLs at production legal pages", () => {
    expect(APP_STORE_LISTING.privacyPolicyUrl).toBe(productionUrl(PRIVACY_PATH));
    expect(APP_STORE_LISTING.supportUrl).toBe(productionUrl(SUPPORT_PATH));
    expect(APP_STORE_LISTING.privacyPolicyUrl).toContain(PRIVACY_PATH);
    expect(APP_STORE_LISTING.supportUrl).toContain(SUPPORT_PATH);
    expect(productionUrl(TERMS_PATH)).toContain(TERMS_PATH);
  });
});
