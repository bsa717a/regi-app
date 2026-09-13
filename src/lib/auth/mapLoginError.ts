import { FirebaseError } from "firebase/app";

export type LoginErrorKind =
  | "invalid_email"
  | "unknown_email"
  | "wrong_password"
  | "invalid_credential"
  | "too_many_requests"
  | "unverified"
  | "generic";

export type LoginErrorGuidance = {
  kind: LoginErrorKind;
  message: string;
  /** Credential problems should keep Reset password in the error, not only in the form. */
  offerPasswordReset: boolean;
  /** Unknown-email (when Firebase still returns it) should point at signup. */
  offerCreateAccount: boolean;
};

const INVALID_EMAIL: LoginErrorGuidance = {
  kind: "invalid_email",
  message: "Enter a valid email address.",
  offerPasswordReset: false,
  offerCreateAccount: false,
};

const UNKNOWN_EMAIL: LoginErrorGuidance = {
  kind: "unknown_email",
  message:
    "No REGI account uses that email. Check the spelling or create an account.",
  offerPasswordReset: false,
  offerCreateAccount: true,
};

const WRONG_PASSWORD: LoginErrorGuidance = {
  kind: "wrong_password",
  message: "That password is incorrect. Try again or reset your password.",
  offerPasswordReset: true,
  offerCreateAccount: false,
};

const MISSING_PASSWORD: LoginErrorGuidance = {
  kind: "wrong_password",
  message: "Enter your password, or reset it if you forgot.",
  offerPasswordReset: true,
  offerCreateAccount: false,
};

const INVALID_CREDENTIAL: LoginErrorGuidance = {
  kind: "invalid_credential",
  message:
    "That email or password doesn’t match. Check both, or reset your password.",
  offerPasswordReset: true,
  offerCreateAccount: false,
};

const TOO_MANY: LoginErrorGuidance = {
  kind: "too_many_requests",
  message:
    "Too many attempts. Try again in a few minutes, or reset your password.",
  offerPasswordReset: true,
  offerCreateAccount: false,
};

const UNVERIFIED: LoginErrorGuidance = {
  kind: "unverified",
  message:
    "This email isn’t verified yet. Open the confirmation link in your inbox, then try again.",
  offerPasswordReset: false,
  offerCreateAccount: false,
};

const GENERIC: LoginErrorGuidance = {
  kind: "generic",
  message: "Could not sign in. Please try again.",
  offerPasswordReset: true,
  offerCreateAccount: false,
};

/**
 * Map Firebase Auth sign-in failures to inline copy + recovery CTAs.
 *
 * Newer Firebase projects enable email enumeration protection, so wrong
 * password and unknown email both arrive as `auth/invalid-credential`.
 * Distinct codes are still mapped when present.
 *
 * Unverified mail is not a sign-in failure in this app (users can enter
 * and see the verify banner). `auth/email-not-verified` is mapped only if
 * Firebase or a future gate ever returns it.
 */
export function mapLoginError(error: unknown): LoginErrorGuidance {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
      case "auth/missing-email":
        return INVALID_EMAIL;
      case "auth/user-not-found":
        return UNKNOWN_EMAIL;
      case "auth/wrong-password":
        return WRONG_PASSWORD;
      case "auth/missing-password":
        return MISSING_PASSWORD;
      case "auth/invalid-credential":
      case "auth/invalid-login-credentials":
        return INVALID_CREDENTIAL;
      case "auth/too-many-requests":
        return TOO_MANY;
      case "auth/email-not-verified":
        return UNVERIFIED;
      default:
        return GENERIC;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return { ...GENERIC, message: error.message };
  }
  return GENERIC;
}
