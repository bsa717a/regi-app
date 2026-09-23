import type { RegistrationStatus } from "@/lib/stateEngine/status";
import { formatUsdCents } from "@/lib/renewals/formatMoney";
import {
  displayedRenewalFee,
  renewalFeeNote,
  type DisplayFeeInput,
} from "@/lib/renewals/displayFee";
import {
  daysCountLabel,
  renewalHeroCopy,
  statusLabel,
  vehicleDisplayName,
} from "@/lib/registrations/brandCopy";
import { primaryActionClassName, StatusInline } from "@/components/brand/ui";

export type RenewalListItem = {
  id: string;
  nickname?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  status: RegistrationStatus;
  daysUntilExpiration: number;
  registrationExpiresOn: string;
  state: string;
  canEdit: boolean;
  /** Second line under the status, e.g. "2013 Touareg" or "Utility trailer". */
  detail: string;
};

export type RenewalFeeSchedule = Omit<
  DisplayFeeInput,
  "daysUntilExpiration"
>;

export function RenewalsInbox({
  vehicles,
  feeSchedule,
  onRenew,
  renewDisabledReason,
}: {
  vehicles: RenewalListItem[];
  feeSchedule?: RenewalFeeSchedule | null;
  onRenew: (vehicle: RenewalListItem) => void;
  renewDisabledReason?: string | null;
}) {
  const focus = [...vehicles].sort(
    (a, b) => a.daysUntilExpiration - b.daysUntilExpiration,
  )[0];

  if (!focus) {
    return (
      <p className="text-sm text-regi-muted">
        Your garage is empty. Add a vehicle and renewals will show up here.
      </p>
    );
  }

  const hero = renewalHeroCopy(focus);
  const fee = feeSchedule
    ? displayedRenewalFee({
        ...feeSchedule,
        daysUntilExpiration: focus.daysUntilExpiration,
      })
    : null;
  const lateNote = fee ? renewalFeeNote(fee.lateFeeCents) : null;
  const canRenew =
    focus.canEdit &&
    (focus.status === "Expired" || focus.status === "Due Soon");
  const dataLine = [
    `EXP ${focus.registrationExpiresOn}`,
    focus.state,
    fee ? `FEE EST. ${formatUsdCents(fee.totalCents)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3">
      <article
        className="rounded-[10px] border border-regi-line bg-regi-surface px-4 py-4"
        data-testid="renewals-hero"
      >
        <StatusInline status={focus.status} />
        <p className="mt-3 font-regi-data text-[44px] leading-none font-bold tracking-[-0.02em] text-regi-text">
          {hero.count}
        </p>
        <p className="mt-2 text-base leading-snug text-regi-text">
          {hero.sentence}
        </p>
        <p className="mt-3 font-regi-data text-[13px] tracking-[0.02em] text-regi-muted">
          {dataLine}
        </p>
        {lateNote ? (
          <p className="mt-3 text-sm leading-relaxed text-regi-muted">
            {lateNote}
          </p>
        ) : canRenew ? (
          <p className="mt-3 text-sm leading-relaxed text-regi-muted">
            We confirm what the state needs, pay the fee, and send the decal.
            You get one message when it ships.
          </p>
        ) : null}
        {canRenew ? (
          <button
            type="button"
            className={`${primaryActionClassName} mt-4`}
            data-testid="renew-now-button"
            onClick={() => onRenew(focus)}
          >
            Renew it for me
          </button>
        ) : renewDisabledReason ? (
          <p className="mt-4 text-sm text-regi-muted">{renewDisabledReason}</p>
        ) : null}
      </article>

      <ul className="space-y-2" data-testid="renewals-list">
        {vehicles.map((vehicle) => (
          <li key={vehicle.id}>
            <article className="rounded-[10px] border border-regi-line bg-regi-surface px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-regi-display text-lg font-medium tracking-[-0.005em] text-regi-text">
                    {vehicleDisplayName(vehicle)}
                  </h3>
                  <p className="mt-0.5 text-sm text-regi-muted">
                    {statusLabel(vehicle.status)} · {vehicle.detail}
                  </p>
                </div>
                <p className="shrink-0 pt-1 font-regi-data text-[13px] tracking-[0.02em] text-regi-text">
                  {daysCountLabel(vehicle.daysUntilExpiration)}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
