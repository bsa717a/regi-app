import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal/constants";
import { linkClassName } from "@/components/auth/AuthFormStyles";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <p className={className}>
      <Link href={PRIVACY_PATH} className={linkClassName}>
        Privacy Policy
      </Link>
      {" · "}
      <Link href={TERMS_PATH} className={linkClassName}>
        Terms of Use
      </Link>
    </p>
  );
}
