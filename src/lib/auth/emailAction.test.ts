import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { PRODUCTION_ORIGIN } from "@/lib/legal/constants";
import {
  isSafeContinueUrl,
  mapEmailActionError,
  parseEmailActionParams,
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
