"use client";

import Link from "next/link";
import { ADMIN_TABS, adminTabHref, type AdminTabId } from "./adminTabs";

export function AdminTabs({ active }: { active: AdminTabId }) {
  return (
    <nav
      aria-label="Admin options"
      className="flex flex-wrap gap-1 border-b border-slate-200/80 pb-px dark:border-slate-700/80"
    >
      {ADMIN_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={adminTabHref(tab.id)}
            className={
              selected
                ? "-mb-px border-b-2 border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800 dark:border-teal-400 dark:text-teal-300"
                : "px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }
            aria-current={selected ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
