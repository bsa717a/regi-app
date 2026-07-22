import { Suspense, type ReactNode } from "react";
import { GuestGuard } from "@/components/auth/GuestGuard";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="text-sm text-slate-600">Loading…</p>
        </div>
      }
    >
      <GuestGuard>{children}</GuestGuard>
    </Suspense>
  );
}
