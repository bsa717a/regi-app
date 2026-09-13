import { SignupForm } from "@/components/auth/SignupForm";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Sign up");

export default function SignupPage() {
  return <SignupForm />;
}
