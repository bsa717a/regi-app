import Link from "next/link";
import {
  CREDITS_PATH,
  PRIVACY_PATH,
  SUPPORT_PATH,
  TERMS_PATH,
} from "@/lib/legal/constants";
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
      {" · "}
      <Link href={SUPPORT_PATH} className={linkClassName}>
        Support
      </Link>
      {" · "}
      <Link href={CREDITS_PATH} className={linkClassName}>
        Photo credits
      </Link>
    </p>
  );
}
