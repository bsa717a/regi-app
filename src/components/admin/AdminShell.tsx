"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StaffGuard } from "@/components/admin/StaffGuard";
import { useAuth } from "@/components/auth/AuthProvider";

const NAV = [
  { href: "/admin", label: "Ops", exact: true },
  { href: "/admin/renewals", label: "Queue" },
  { href: "/admin/search", label: "Search" },
] as const;

function navActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { logOut } = useAuth();

  return (
    <StaffGuard>
      <div className="flex min-h-full flex-1 flex-col bg-slate-100">
        <header className="border-b border-slate-300 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                REGI Admin
              </p>
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              {NAV.map((item) => {
                const active = navActive(
                  pathname,
                  item.href,
                  "exact" in item ? item.exact : false,
                );
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "rounded bg-slate-900 px-2.5 py-1.5 text-white"
                        : "rounded px-2.5 py-1.5 text-slate-700 hover:bg-slate-200"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => void logOut()}
                className="rounded px-2.5 py-1.5 text-slate-600 hover:bg-slate-200"
              >
                Sign out
              </button>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
          {children}
        </main>
      </div>
    </StaffGuard>
  );
}
