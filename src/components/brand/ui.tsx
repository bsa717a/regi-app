import type { ReactNode } from "react";
import type { RegistrationStatus } from "@/lib/stateEngine/status";
import { statusLabel } from "@/lib/registrations/brandCopy";

export const headerActionClassName =
  "rounded-[6px] bg-regi-accent px-3 py-1.5 text-sm font-medium text-regi-ground transition hover:bg-regi-accent-pressed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-regi-accent";

export const primaryActionClassName =
  "inline-flex w-full items-center justify-center rounded-[6px] bg-regi-accent px-4 py-3.5 text-base font-medium text-regi-ground transition hover:bg-regi-accent-pressed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-regi-accent disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryActionClassName =
  "inline-flex w-full items-center justify-center rounded-[6px] border border-regi-line bg-transparent px-4 py-3.5 text-base font-medium text-regi-text transition hover:bg-regi-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-regi-accent";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-regi-data text-[11px] font-bold tracking-[0.16em] text-regi-muted uppercase">
      {children}
    </p>
  );
}

const statusDot: Record<RegistrationStatus, string> = {
  Current: "bg-regi-current",
  "Due Soon": "bg-regi-due",
  Expired: "bg-regi-expired",
};

const statusText: Record<RegistrationStatus, string> = {
  Current: "text-regi-current",
  "Due Soon": "text-regi-due",
  Expired: "text-regi-expired",
};

export function StatusInline({ status }: { status: RegistrationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${statusText[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[status]}`}
        aria-hidden
      />
      {statusLabel(status)}
    </span>
  );
}

export function BrandSwitch({
  id,
  checked,
  disabled,
  labelledBy,
  describedBy,
  onChange,
}: {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-regi-accent disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-regi-accent" : "bg-regi-line"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-regi-text shadow transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function RegiMark({ size = 34 }: { size?: number }) {
  const dot = Math.max(3, Math.round((14 / 160) * size));
  const inset = (30 / 160) * size;
  const showDot = size >= 32;
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center border border-regi-line bg-regi-surface font-regi-display font-bold text-regi-text"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        fontSize: size * (88 / 160),
        letterSpacing: "-0.04em",
        lineHeight: 1,
      }}
    >
      R
      {showDot ? (
        <span
          className="absolute rounded-full bg-regi-accent"
          style={{
            width: dot,
            height: dot,
            right: inset,
            bottom: inset,
          }}
        />
      ) : null}
    </span>
  );
}
