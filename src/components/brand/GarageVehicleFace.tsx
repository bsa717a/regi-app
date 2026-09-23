import type { ReactNode } from "react";
import type { RegistrationStatus } from "@/lib/stateEngine/status";
import { daysCountLabel } from "@/lib/registrations/brandCopy";
import { StatusInline } from "@/components/brand/ui";

export function GarageVehicleFace({
  title,
  subtitle,
  status,
  daysUntilExpiration,
  media,
  countdownTestId,
}: {
  title: string;
  subtitle: string;
  status: RegistrationStatus;
  daysUntilExpiration: number;
  media: ReactNode;
  countdownTestId?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-regi-line bg-regi-surface">
      <div className="relative h-40 w-full bg-regi-raised">{media}</div>
      <div className="flex items-start justify-between gap-3 px-3.5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate font-regi-display text-xl font-medium tracking-[-0.005em] text-regi-text">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-regi-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          <StatusInline status={status} />
          <p
            data-testid={countdownTestId}
            className="font-regi-data text-[13px] tracking-[0.02em] text-regi-text"
          >
            {daysCountLabel(daysUntilExpiration)}
          </p>
        </div>
      </div>
    </div>
  );
}
