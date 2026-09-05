"use client";

import { useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import { OpsDashboard } from "@/components/admin/OpsDashboard";
import { RenewalQueueClient } from "@/components/admin/RenewalQueueClient";
import { AdminSearchClient } from "@/components/admin/AdminSearchClient";
import { parseAdminTab } from "@/components/admin/adminTabs";

export function AdminPortalClient() {
  const searchParams = useSearchParams();
  const tab = parseAdminTab(searchParams.get("tab"));

  return (
    <AdminShell title="Admin" activeTab={tab}>
      {tab === "users" ? <AdminUsersClient /> : null}
      {tab === "ops" ? <OpsDashboard /> : null}
      {tab === "queue" ? <RenewalQueueClient /> : null}
      {tab === "search" ? <AdminSearchClient /> : null}
    </AdminShell>
  );
}
