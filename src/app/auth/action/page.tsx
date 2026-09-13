import { Suspense } from "react";
import { EmailActionHandler } from "@/components/auth/EmailActionHandler";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Email confirmation", {
  robots: { index: false, follow: false },
});

export default function EmailActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading email link…
          </p>
        </div>
      }
    >
      <EmailActionHandler />
    </Suspense>
  );
}
