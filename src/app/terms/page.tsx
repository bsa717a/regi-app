import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import {
  LEGAL_LAST_UPDATED,
  legalContactEmail,
} from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Terms of Use · REGI",
  description: "Terms for using the REGI vehicle registration app.",
};

export default function TermsPage() {
  const contact = legalContactEmail();

  return (
    <LegalPageShell title="Terms of Use" updated={LEGAL_LAST_UPDATED}>
      <p>
        These terms govern your use of REGI, including the website and iOS app.
        By creating an account you agree to them. If you do not agree, do not
        use the service.
      </p>

      <LegalSection title="The service">
        <p>
          REGI helps you store vehicle registration information, related
          documents, and reminders. We are not a government agency, DMV, or
          insurer. REGI does not file registrations with a state unless you
          separately use a concierge renewal flow we offer, and even then you
          remain responsible for accuracy and deadlines.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You must provide a valid email and keep your password confidential.
          You are responsible for activity on your account. You may delete your
          account at any time in Settings. We may suspend accounts that abuse
          the service or violate these terms.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You retain ownership of documents and photos you upload. You grant us
          a limited license to store, display, and process that content so we
          can provide REGI (including optional scan/enhance). Upload only
          materials you have the right to use. Do not upload other people’s
          government documents without permission.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Do not misuse REGI: no unauthorized access, scraping, malware, or
          attempts to disrupt the service. Do not use REGI to impersonate
          others or to submit false registration information to a government
          office.
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          The current REGI product does not charge you in the app for
          subscriptions or digital goods. Government registration fees, if
          shown, are informational. If we later offer paid features, we will
          update these terms and follow Apple’s in-app purchase rules where
          they apply.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <p>
          REGI is provided “as is.” Reminder timing, scan results, and fee
          estimates can be wrong or incomplete. You are responsible for
          confirming deadlines and requirements with the relevant state or
          agency. To the extent allowed by law, we disclaim warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the extent allowed by law, REGI and its operators are not liable
          for lost profits, lost data, missed registration deadlines, fines, or
          indirect damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms. The “Last updated” date will change when
          we do. Questions:{" "}
          <a
            href={`mailto:${contact}`}
            className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            {contact}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
