import { LoginForm } from "@/components/auth/LoginForm";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Login");

export default function LoginPage() {
  return <LoginForm />;
}
