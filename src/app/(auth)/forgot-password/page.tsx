import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Forgot password");

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
