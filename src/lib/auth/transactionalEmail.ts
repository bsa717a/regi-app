import type { EmailProvider } from "@/lib/notifications/EmailProvider";
import { MockEmailProvider } from "@/lib/notifications/MockEmailProvider";

export class EmailDeliveryNotConfiguredError extends Error {
  constructor() {
    super(
      "Email delivery is not configured, so this message cannot be sent.",
    );
    this.name = "EmailDeliveryNotConfiguredError";
  }
}

export interface FirebaseErrorInfo {
  code: string;
  message: string;
  errorInfo?: Record<string, unknown>;
  rawError: unknown;
}

export function extractFirebaseErrorInfo(err: unknown): FirebaseErrorInfo {
  const code = firebaseAuthErrorCode(err);
  const message = err instanceof Error ? err.message : String(err);

  let errorInfo: Record<string, unknown> | undefined;
  if (err && typeof err === "object") {
    if ("errorInfo" in err && typeof err.errorInfo === "object") {
      errorInfo = err.errorInfo as Record<string, unknown>;
    } else if ("codePrefix" in err || "customData" in err) {
      const errObj = err as Record<string, unknown>;
      const info: Record<string, unknown> = {};
      if (errObj.codePrefix) {
        info.codePrefix = errObj.codePrefix;
      }
      if (errObj.customData) {
        info.customData = errObj.customData;
      }
      if (Object.keys(info).length > 0) {
        errorInfo = info;
      }
    }
  }

  return { code, message, errorInfo, rawError: err };
}

export function formatFirebaseErrorForLog(
  context: string,
  err: unknown,
): string {
  const info = extractFirebaseErrorInfo(err);
  const parts = [`[${context}] Firebase error`];

  if (info.code) {
    parts.push(`code=${info.code}`);
  }
  parts.push(`message=${info.message}`);

  if (info.errorInfo) {
    try {
      parts.push(`errorInfo=${JSON.stringify(info.errorInfo)}`);
    } catch {
      parts.push("errorInfo=[non-serializable]");
    }
  }

  return parts.join(" | ");
}

export function assertCanDeliverTransactionalEmail(
  provider: EmailProvider,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv === "production" && provider instanceof MockEmailProvider) {
    throw new EmailDeliveryNotConfiguredError();
  }
}

export function firebaseAuthErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return "";
}

export function isMissingFirebaseAuthUser(err: unknown): boolean {
  const code = firebaseAuthErrorCode(err);
  return code === "auth/user-not-found" || code === "auth/email-not-found";
}

/**
 * Password-reset link generation for unknown emails often returns HTTP 200
 * without `oobLink`. The Admin SDK then throws auth/internal-error instead of
 * user-not-found. Treat that as "no account" so we do not leak existence.
 */
export function isPasswordResetLinkUnavailable(err: unknown): boolean {
  if (isMissingFirebaseAuthUser(err)) return true;
  const code = firebaseAuthErrorCode(err);
  const message = err instanceof Error ? err.message : "";
  return (
    code === "auth/internal-error" &&
    /unable to create the email action link/i.test(message)
  );
}
