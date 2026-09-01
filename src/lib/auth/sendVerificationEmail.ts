import { rewriteFirebaseEmailActionLink } from "@/lib/auth/emailAction";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import type { EmailProvider } from "@/lib/notifications/EmailProvider";
import { MockEmailProvider } from "@/lib/notifications/MockEmailProvider";
import { renderNotificationTemplate } from "@/lib/notifications/templates";

export class EmailDeliveryNotConfiguredError extends Error {
  constructor() {
    super(
      "Email delivery is not configured, so a verification message cannot be sent.",
    );
    this.name = "EmailDeliveryNotConfiguredError";
  }
}

export function assertCanDeliverTransactionalEmail(
  provider: EmailProvider,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv === "production" && provider instanceof MockEmailProvider) {
    throw new EmailDeliveryNotConfiguredError();
  }
}

export async function sendVerificationEmail(deps: {
  email: string;
  appOrigin: string;
  emailProvider: EmailProvider;
  nodeEnv?: string;
  generateLink?: (email: string, continueUrl: string) => Promise<string>;
}): Promise<void> {
  assertCanDeliverTransactionalEmail(deps.emailProvider, deps.nodeEnv);

  const continueUrl = `${deps.appOrigin.replace(/\/$/, "")}/garage`;
  const generate =
    deps.generateLink ??
    ((email, url) =>
      getFirebaseAdminAuth().generateEmailVerificationLink(email, {
        url,
        handleCodeInApp: false,
      }));

  const firebaseLink = await generate(deps.email, continueUrl);
  const verifyUrl = rewriteFirebaseEmailActionLink(
    firebaseLink,
    deps.appOrigin,
  );
  const rendered = renderNotificationTemplate("verify_email", { verifyUrl });

  await deps.emailProvider.send({
    to: deps.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}
