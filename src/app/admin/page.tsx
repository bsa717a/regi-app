import { Suspense } from "react";
import { AdminPortalClient } from "@/components/admin/AdminPortalClient";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Admin");

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-slate-600 dark:text-slate-400">
          Loading admin…
        </div>
      }
    >
      <AdminPortalClient />
    </Suspense>
  );
}
