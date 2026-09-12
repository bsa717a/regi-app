import { describe, expect, it } from "vitest";
import { resolveStagingDemoApplicant } from "@/lib/deploy/stagingDemoApplicant";

describe("resolveStagingDemoApplicant", () => {
  it("is a no-op when both env vars are blank", () => {
    expect(resolveStagingDemoApplicant({})).toBeNull();
    expect(
      resolveStagingDemoApplicant({
        STAGING_DEMO_APPLICANT_EMAIL: "  ",
        STAGING_DEMO_APPLICANT_FIREBASE_UID: "",
      }),
    ).toBeNull();
  });

  it("requires email and uid together", () => {
    expect(() =>
      resolveStagingDemoApplicant({
        STAGING_DEMO_APPLICANT_EMAIL: "walk@regi.app",
      }),
    ).toThrow(/must be set together/);
    expect(() =>
      resolveStagingDemoApplicant({
        STAGING_DEMO_APPLICANT_FIREBASE_UID: "uid-1",
      }),
    ).toThrow(/must be set together/);
  });

  it("returns the Priority 2 applicant when both are set", () => {
    expect(
      resolveStagingDemoApplicant({
        STAGING_DEMO_APPLICANT_EMAIL: " walk@regi.app ",
        STAGING_DEMO_APPLICANT_FIREBASE_UID: " firebase-walk-uid ",
      }),
    ).toEqual({
      email: "walk@regi.app",
      firebaseUid: "firebase-walk-uid",
    });
  });

  it("rejects a non-email", () => {
    expect(() =>
      resolveStagingDemoApplicant({
        STAGING_DEMO_APPLICANT_EMAIL: "not-an-email",
        STAGING_DEMO_APPLICANT_FIREBASE_UID: "uid-1",
      }),
    ).toThrow(/must be an email/);
  });
});
