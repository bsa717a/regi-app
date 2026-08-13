import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import {
  PRIVACY_PATH,
  TERMS_PATH,
  legalContactEmail,
} from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Support · REGI",
  description: "How to get help with REGI, including account and privacy questions.",
};

export default function SupportPage() {
  const contact = legalContactEmail();

  return (
    <LegalPageShell title="Support">
      <p>
        REGI helps you track vehicle registrations, documents, and renewal
        reminders. If something is broken or you need help with your account,
        email{" "}
        <a
          href={`mailto:${contact}`}
          className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
        >
          {contact}
        </a>
        .
      </p>

      <LegalSection title="Account">
        <p>
          Sign in with the email you used to create your account. Forgot your
          password? Use Forgot password on the sign-in screen.
        </p>
        <p>
          To delete your account and garage data: open REGI → Settings → Delete
          account. That removes your profile, owned vehicles and documents, and
          your sign-in.
        </p>
      </LegalSection>

      <LegalSection title="iPhone app">
        <p>
          Face ID unlock, push reminders, and camera capture are optional. You
          can change them in Settings inside REGI, or in iOS Settings → REGI.
        </p>
      </LegalSection>

      <LegalSection title="Policies">
        <p>
          <Link
            href={PRIVACY_PATH}
            className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Privacy Policy
          </Link>
          {" · "}
          <Link
            href={TERMS_PATH}
            className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Terms of Use
          </Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
