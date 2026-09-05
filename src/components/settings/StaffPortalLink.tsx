"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchAdminMe } from "@/lib/api/client";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";

/**
 * Staff-only entry into /admin. Hidden unless the signed-in account
 * is on the staff_users allowlist.
 */
export function StaffPortalLink() {
  const { getIdToken } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        await fetchAdminMe(token);
        if (!cancelled) setVisible(true);
      } catch {
        if (!cancelled) setVisible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  if (!visible) return null;

  return (
    <section className="border-t border-slate-200 pt-6 dark:border-slate-700">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Admin
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Staff tools for users, renewals, and ops.
      </p>
      <Link href="/admin" className={`${primaryButtonClassName} mt-3`}>
        Open admin portal
      </Link>
    </section>
  );
}
