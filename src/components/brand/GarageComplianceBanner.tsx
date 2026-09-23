import type { ComplianceBanner } from "@/lib/registrations/brandCopy";

const dot: Record<ComplianceBanner["tone"], string> = {
  current: "bg-regi-current",
  due: "bg-regi-due",
  expired: "bg-regi-expired",
};

export function GarageComplianceBanner({
  banner,
}: {
  banner: ComplianceBanner;
}) {
  return (
    <section
      className="flex gap-3 rounded-[10px] border border-regi-line bg-regi-surface px-3.5 py-3.5"
      data-testid="garage-compliance-banner"
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[banner.tone]}`}
        aria-hidden
      />
      <div className="min-w-0">
        <h2 className="text-base font-medium text-regi-text">{banner.title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-regi-muted">
          {banner.detail}
        </p>
      </div>
    </section>
  );
}
