import type { RegistrationStatus } from "@/lib/stateEngine/status";

const styles: Record<RegistrationStatus, string> = {
  Current: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  "Due Soon": "bg-amber-100 text-amber-950 ring-amber-200",
  Expired: "bg-rose-100 text-rose-900 ring-rose-200",
};

const dots: Record<RegistrationStatus, string> = {
  Current: "bg-emerald-500",
  "Due Soon": "bg-amber-500",
  Expired: "bg-rose-500",
};

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} aria-hidden />
      {status}
    </span>
  );
}
