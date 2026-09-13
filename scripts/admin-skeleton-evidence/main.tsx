import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AdminTableSkeleton } from "@/components/admin/AdminTable";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { fieldClassName } from "@/components/auth/AuthFormStyles";
import "./evidence.css";

const QUEUE_FILTERS = [
  { value: "active", label: "Active" },
  { value: "all", label: "All" },
  { value: "Requested", label: "Requested" },
  { value: "DocumentsReceived", label: "Documents Received" },
  { value: "Reviewing", label: "Reviewing" },
  { value: "Processing", label: "Processing" },
  { value: "Submitted", label: "Submitted" },
  { value: "Completed", label: "Completed" },
  { value: "StickerMailed", label: "Sticker Mailed" },
];

function AdminEvidenceChrome({
  tab,
  children,
}: {
  tab: "queue" | "users";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_28%,#f8fafc_100%)]">
      <header className="border-b border-slate-200/70 bg-white/90 px-4 pt-3 pb-3 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
                REGI
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                Admin
              </h1>
            </div>
            <span className="rounded-xl bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white">
              Settings
            </span>
          </div>
          <div className="mt-3">
            <AdminTabs active={tab} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-8">
        <p className="mb-4 text-sm font-medium text-teal-800">
          ← Back to settings
        </p>
        {children}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <div className="min-h-screen space-y-10 bg-slate-100 py-6">
    <section id="admin-queue-skeleton" className="mx-auto max-w-5xl">
      <AdminEvidenceChrome tab="queue">
        <div className="mb-4 flex flex-wrap gap-2">
          {QUEUE_FILTERS.map((filter) => (
            <span
              key={filter.value}
              className={
                filter.value === "active"
                  ? "rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              }
            >
              {filter.label}
            </span>
          ))}
        </div>
        <AdminTableSkeleton
          headers={["Vehicle", "Status", "Owner", "Plate", "Expires", ""]}
          rows={6}
          label="Loading queue"
          testId="admin-queue-skeleton"
        />
      </AdminEvidenceChrome>
    </section>

    <section id="admin-users-skeleton" className="mx-auto max-w-5xl">
      <AdminEvidenceChrome tab="users">
        <input
          type="search"
          readOnly
          placeholder="Filter by email or name…"
          aria-label="Filter users by email or name"
          className={`${fieldClassName} mt-0 mb-4`}
        />
        <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-200" />
        <AdminTableSkeleton
          headers={[
            "Name",
            "Email",
            "Phone",
            "Address",
            "Role",
            "Joined",
            "Vehicles",
            "Renewals",
            "",
          ]}
          rows={8}
          label="Loading users"
          testId="admin-users-skeleton"
        />
      </AdminEvidenceChrome>
    </section>
  </div>,
);
