import { FirebaseError } from "firebase/app";
import {
  LEGACY_PRODUCTION_ORIGIN,
  PRODUCTION_ORIGIN,
} from "@/lib/legal/constants";

export const EMAIL_ACTION_PATH = "/auth/action";

export type EmailActionMode = "verifyEmail" | "resetPassword" | "recoverEmail";

export type EmailActionParams = {
  mode: EmailActionMode | null;
  oobCode: string;
  continueUrl: string | null;
};

export function parseEmailActionParams(input: {
  mode: string | null;
  oobCode: string | null;
  continueUrl: string | null;
}): EmailActionParams {
  const mode = input.mode;
  const valid: EmailActionMode | null =
    mode === "verifyEmail" ||
    mode === "resetPassword" ||
    mode === "recoverEmail"
      ? mode
      : null;

  return {
    mode: valid,
    oobCode: input.oobCode?.trim() ?? "",
    continueUrl: input.continueUrl?.trim() || null,
  };
}

export function rewriteFirebaseEmailActionLink(
  link: string,
  handlerOrigin: string,
): string {
  const source = new URL(link);
  const dest = new URL(EMAIL_ACTION_PATH, handlerOrigin);
  dest.search = source.search;
  dest.hash = source.hash;
  return dest.toString();
}

export function allowedEmailActionOrigins(): string[] {
  const origins = new Set<string>([
    PRODUCTION_ORIGIN,
    LEGACY_PRODUCTION_ORIGIN,
    "https://regireg.com",
    "https://www.regireg.com",
  ]);
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    try {
      origins.add(new URL(fromEnv).origin);
    } catch {
      // Ignore malformed env; production origin is still allowed.
    }
  }
  return [...origins];
}

export function isSafeContinueUrl(
  url: string | null,
  allowedOrigins: readonly string[] = allowedEmailActionOrigins(),
): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.username || parsed.password) return false;
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

export function mapEmailActionError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/expired-action-code":
      case "auth/invalid-action-code":
        return "This link has expired or was already used. Request a new email and try again.";
      case "auth/user-disabled":
        return "This account is disabled.";
      case "auth/user-not-found":
        return "This account no longer exists.";
      case "auth/weak-password":
        return "Use at least 6 characters for your password.";
      default:
        return "Could not complete this request. Please try again.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Could not complete this request. Please try again.";
}
