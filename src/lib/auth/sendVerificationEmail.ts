import { buildActionCodeSettings } from "@/lib/auth/actionCodeSettings";
import { rewriteFirebaseEmailActionLink } from "@/lib/auth/emailAction";
import { assertCanDeliverTransactionalEmail } from "@/lib/auth/transactionalEmail";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import type { EmailProvider } from "@/lib/notifications/EmailProvider";
import { renderNotificationTemplate } from "@/lib/notifications/templates";

export {
  EmailDeliveryNotConfiguredError,
  assertCanDeliverTransactionalEmail,
} from "@/lib/auth/transactionalEmail";

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
      getFirebaseAdminAuth().generateEmailVerificationLink(
        email,
        buildActionCodeSettings(url),
      ));

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
