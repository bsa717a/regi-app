import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import {
  LEGAL_LAST_UPDATED,
  legalContactEmail,
} from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Privacy Policy · REGI",
  description:
    "How REGI collects, uses, and deletes account data, vehicle documents, and device tokens.",
};

export default function PrivacyPage() {
  const contact = legalContactEmail();

  return (
    <LegalPageShell title="Privacy Policy" updated={LEGAL_LAST_UPDATED}>
      <p>
        REGI (“we”, “us”) helps you track vehicle registrations, documents, and
        renewal reminders. This policy describes what we collect, why, and how
        you can delete it. It applies to the REGI website, the iOS app, and our
        APIs.
      </p>

      <LegalSection title="Who we are">
        <p>
          Questions about privacy:{" "}
          <a
            href={`mailto:${contact}`}
            className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            {contact}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Account data.
            </strong>{" "}
            Name, email, optional phone, and a Firebase Authentication user id
            when you create an account.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Vehicle and registration records.
            </strong>{" "}
            Details you enter (VIN, plate, state, expiration, maintenance, and
            similar fields) plus household membership.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Photos and documents.
            </strong>{" "}
            Registration cards, receipts, titles, and vehicle photos you upload.
            Files are stored in a private Google Cloud Storage bucket and are
            not public.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Push tokens.
            </strong>{" "}
            If you enable notifications, we store a web or iOS device token so
            we can send renewal and maintenance reminders.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              In-app assistant messages.
            </strong>{" "}
            Questions you send to REGI’s assistant, so we can reply in context.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use information">
        <p>
          We use this data to run your garage, send the reminders you opt into,
          process document scans you request, and keep the service secure. We
          do not sell your personal information and we do not use it for
          third-party advertising or cross-app tracking.
        </p>
      </LegalSection>

      <LegalSection title="Document scanning (Gemini)">
        <p>
          If you use scan or enhance on a registration card or receipt, we send
          that image to Google’s Gemini API to read text and improve
          readability. Use this only for documents you have the right to
          process. We do not use those images to train our own models.
        </p>
      </LegalSection>

      <LegalSection title="Service providers">
        <ul className="list-disc space-y-2 pl-5">
          <li>Firebase Authentication — sign-in.</li>
          <li>Google Cloud (Cloud Run, Cloud SQL, Cloud Storage) — app and files.</li>
          <li>Firebase Cloud Messaging and Apple Push Notification service — optional alerts.</li>
          <li>SendGrid — optional email reminders when that channel is enabled.</li>
          <li>Google Gemini — optional document scan / enhance.</li>
        </ul>
        <p>
          These providers process data on our instructions. They are not
          permitted to use your REGI content for their own marketing.
        </p>
      </LegalSection>

      <LegalSection title="iOS permissions">
        <p>
          The iOS app may ask for Face ID (optional unlock), camera (capture
          cards and receipts), photos (choose existing images), and
          notifications (reminders you enable in Settings). You can change
          these in iOS Settings. We do not access the camera or photo library
          unless you pick or capture a file in the app.
        </p>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p>
          We keep your account and garage data until you delete the account or
          ask us to remove it. In the app: Settings → Delete account. That
          flow removes your profile, owned household and vehicles, stored
          files, push tokens, assistant history, and your Firebase Auth user.
          Documents you uploaded in someone else’s shared household stay with
          that household and are reassigned to the owner.
        </p>
        <p>
          You can also email {contact} if you cannot use the in-app flow.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          REGI is not directed at children under 13, and we do not knowingly
          collect personal information from them.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy. The “Last updated” date at the top will
          change when we do. Continued use after an update means you accept the
          revised policy.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
