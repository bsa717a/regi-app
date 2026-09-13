import { Suspense } from "react";
import { AcceptInviteClient } from "@/components/household/AcceptInviteClient";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Accept invite");

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading invite…
          </p>
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}
