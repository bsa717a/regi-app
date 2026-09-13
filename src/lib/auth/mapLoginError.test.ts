import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { mapLoginError } from "@/lib/auth/mapLoginError";

function firebase(code: string) {
  return new FirebaseError(code, code);
}

describe("mapLoginError", () => {
  it("guides invalid or missing email", () => {
    for (const code of ["auth/invalid-email", "auth/missing-email"]) {
      expect(mapLoginError(firebase(code))).toMatchObject({
        kind: "invalid_email",
        message: "Enter a valid email address.",
        offerPasswordReset: false,
        offerCreateAccount: false,
      });
    }
  });

  it("guides unknown email when Firebase still returns user-not-found", () => {
    expect(mapLoginError(firebase("auth/user-not-found"))).toMatchObject({
      kind: "unknown_email",
      message:
        "No REGI account uses that email. Check the spelling or create an account.",
      offerPasswordReset: false,
      offerCreateAccount: true,
    });
  });

  it("guides wrong or missing password toward reset", () => {
    expect(mapLoginError(firebase("auth/wrong-password"))).toMatchObject({
      kind: "wrong_password",
      message: "That password is incorrect. Try again or reset your password.",
      offerPasswordReset: true,
    });
    expect(mapLoginError(firebase("auth/missing-password"))).toMatchObject({
      kind: "wrong_password",
      message: "Enter your password, or reset it if you forgot.",
      offerPasswordReset: true,
    });
  });

  it("treats enumeration-protected credential errors as a combined check", () => {
    for (const code of [
      "auth/invalid-credential",
      "auth/invalid-login-credentials",
    ]) {
      expect(mapLoginError(firebase(code))).toMatchObject({
        kind: "invalid_credential",
        offerPasswordReset: true,
        offerCreateAccount: false,
      });
      expect(mapLoginError(firebase(code)).message).toMatch(
        /email or password/i,
      );
    }
  });

  it("offers reset after too many attempts", () => {
    expect(mapLoginError(firebase("auth/too-many-requests"))).toMatchObject({
      kind: "too_many_requests",
      offerPasswordReset: true,
    });
  });

  it("maps unverified only when that Auth code is present", () => {
    expect(mapLoginError(firebase("auth/email-not-verified"))).toMatchObject({
      kind: "unverified",
      offerPasswordReset: false,
      message: expect.stringMatching(/verified/i),
    });
  });

  it("falls back for unknown Auth codes and plain errors", () => {
    expect(mapLoginError(firebase("auth/network-request-failed")).kind).toBe(
      "generic",
    );
    expect(mapLoginError(new Error("Custom boom")).message).toBe("Custom boom");
    expect(mapLoginError("nope").kind).toBe("generic");
  });
});
