import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { PRODUCTION_ORIGIN } from "@/lib/legal/constants";
import {
  isSafeContinueUrl,
  mapEmailActionError,
  parseEmailActionParams,
  rewriteFirebaseEmailActionLink,
} from "@/lib/auth/emailAction";

describe("parseEmailActionParams", () => {
  it("accepts known modes and trims the oob code", () => {
    expect(
      parseEmailActionParams({
        mode: "verifyEmail",
        oobCode: "  abc123  ",
        continueUrl: " https://example.com/next ",
      }),
    ).toEqual({
      mode: "verifyEmail",
      oobCode: "abc123",
      continueUrl: "https://example.com/next",
    });
  });

  it("rejects unknown modes and missing codes", () => {
    expect(
      parseEmailActionParams({
        mode: "signIn",
        oobCode: null,
        continueUrl: null,
      }),
    ).toEqual({
      mode: null,
      oobCode: "",
      continueUrl: null,
    });
  });
});

describe("rewriteFirebaseEmailActionLink", () => {
  it("moves the oob code onto the REGI handler origin", () => {
    const rewritten = rewriteFirebaseEmailActionLink(
      "https://regi-app-v1.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=abc&apiKey=dead",
      "https://regi-90502049802.us-central1.run.app",
    );
    expect(rewritten).toBe(
      "https://regi-90502049802.us-central1.run.app/auth/action?mode=verifyEmail&oobCode=abc&apiKey=dead",
    );
  });
});

describe("isSafeContinueUrl", () => {
  it("allows only listed origins", () => {
    expect(
      isSafeContinueUrl(`${PRODUCTION_ORIGIN}/garage`, [PRODUCTION_ORIGIN]),
    ).toBe(true);
    expect(
      isSafeContinueUrl("https://evil.example/phish", [PRODUCTION_ORIGIN]),
    ).toBe(false);
    expect(isSafeContinueUrl("javascript:alert(1)", [PRODUCTION_ORIGIN])).toBe(
      false,
    );
    expect(isSafeContinueUrl(null, [PRODUCTION_ORIGIN])).toBe(false);
  });
});

describe("mapEmailActionError", () => {
  it("maps expired and invalid action codes to a resend message", () => {
    expect(
      mapEmailActionError(
        new FirebaseError(
          "auth/invalid-action-code",
          "The action code is invalid.",
        ),
      ),
    ).toMatch(/expired or was already used/i);
  });
});
