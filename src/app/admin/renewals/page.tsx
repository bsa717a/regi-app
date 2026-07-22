import { Suspense } from "react";
import { RenewalQueueClient } from "@/components/admin/RenewalQueueClient";

export default function AdminRenewalsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-slate-600">Loading queue…</div>
      }
    >
      <RenewalQueueClient />
    </Suspense>
  );
}
