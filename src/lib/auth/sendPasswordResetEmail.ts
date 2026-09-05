import { rewriteFirebaseEmailActionLink } from "@/lib/auth/emailAction";
import {
  assertCanDeliverTransactionalEmail,
  isPasswordResetLinkUnavailable,
} from "@/lib/auth/transactionalEmail";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import type { EmailProvider } from "@/lib/notifications/EmailProvider";
import { renderNotificationTemplate } from "@/lib/notifications/templates";

export async function sendPasswordResetEmail(deps: {
  email: string;
  appOrigin: string;
  emailProvider: EmailProvider;
  nodeEnv?: string;
  generateLink?: (email: string, continueUrl: string) => Promise<string>;
}): Promise<void> {
  assertCanDeliverTransactionalEmail(deps.emailProvider, deps.nodeEnv);

  const continueUrl = `${deps.appOrigin.replace(/\/$/, "")}/login`;
  const generate =
    deps.generateLink ??
    ((email, url) =>
      getFirebaseAdminAuth().generatePasswordResetLink(email, {
        url,
        handleCodeInApp: false,
      }));

  let firebaseLink: string;
  try {
    firebaseLink = await generate(deps.email, continueUrl);
  } catch (err) {
    if (isPasswordResetLinkUnavailable(err)) return;
    throw err;
  }

  const resetUrl = rewriteFirebaseEmailActionLink(firebaseLink, deps.appOrigin);
  const rendered = renderNotificationTemplate("reset_password", { resetUrl });

  await deps.emailProvider.send({
    to: deps.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}
