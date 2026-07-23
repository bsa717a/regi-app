"use client";

import Link from "next/link";
import type { RegistrationDto } from "@/lib/registrations/types";
import {
  REGISTRATION_TYPE_LABELS,
  identityLine,
  titleCaseMakeModel,
} from "@/lib/registrations/illustrations";
import { stateName } from "@/lib/registrations/states";
import { StatusBadge } from "@/components/garage/StatusBadge";
import { VehicleIllustration } from "@/components/garage/VehicleIllustration";

function formatExpiresOn(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function plateLabel(type: RegistrationDto["type"]): string {
  switch (type) {
    case "boat":
      return "Registration number";
    case "ohv":
    case "snowmobile":
      return "Decal number";
    default:
      return "License plate";
  }
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function VehicleCard({
  vehicle,
  expanded,
  onToggle,
  onEdit,
}: {
  vehicle: RegistrationDto;
  expanded: boolean;
  onToggle: () => void;
  onEdit?: (vehicle: RegistrationDto) => void;
}) {
  const make = titleCaseMakeModel(vehicle.make);
  const model = titleCaseMakeModel(vehicle.model);
  const headline = [vehicle.year, make, model].filter(Boolean).join(" ") ||
    "Registration";
  const label = vehicle.nickname || headline;
  const typeLabel = REGISTRATION_TYPE_LABELS[vehicle.type];
  const detailsId = `registration-details-${vehicle.id}`;

  const showRenew =
    vehicle.canEdit &&
    (vehicle.status === "Due Soon" || vehicle.status === "Expired");

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 transition hover:shadow-md">
      <button
        type="button"
        className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
      >
        <div className="relative h-36 w-full overflow-hidden">
          <VehicleIllustration
            bodyClass={vehicle.bodyClass}
            photoUrl={vehicle.photoUrl}
            label={label}
            registrationType={vehicle.type}
          />
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-200/80 backdrop-blur">
              {typeLabel}
            </span>
          </div>
          <div className="absolute right-3 top-3">
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            {vehicle.nickname ? (
              <>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {vehicle.nickname}
                </h3>
                <p className="text-sm text-slate-600">{headline}</p>
              </>
            ) : (
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                {headline}
              </h3>
            )}
            <p
              className={`mt-2 text-sm font-medium ${
                vehicle.status === "Expired"
                  ? "text-rose-700"
                  : vehicle.status === "Due Soon"
                    ? "text-amber-800"
                    : "text-teal-800"
              }`}
            >
              {vehicle.countdown}
            </p>
          </div>
          <span
            aria-hidden
            className={`mt-1 shrink-0 text-slate-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDownIcon />
          </span>
        </div>
      </button>

      <div
        id={detailsId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
              <DetailItem label="Type" value={typeLabel} />
              <DetailItem label="State" value={stateName(vehicle.state)} />
              <DetailItem
                label="Expires"
                value={formatExpiresOn(vehicle.registrationExpiresOn)}
              />
              <DetailItem label="Primary ID" value={identityLine(vehicle)} />
              <DetailItem label={plateLabel(vehicle.type)} value={vehicle.plate} />
              <DetailItem label="VIN" value={vehicle.vin} />
              <DetailItem label="HIN" value={vehicle.details.hin ?? null} />
              <DetailItem label="Serial" value={vehicle.details.serial ?? null} />
              <DetailItem
                label="Year / make / model"
                value={headline !== "Registration" ? headline : null}
              />
              <DetailItem label="Body style" value={vehicle.bodyClass} />
              <DetailItem label="Nickname" value={vehicle.nickname} />
              <DetailItem
                label="OHV class"
                value={vehicle.details.ohvClass ?? null}
              />
              <DetailItem
                label="Unladen weight"
                value={
                  vehicle.details.unladenWeightLbs != null
                    ? `${vehicle.details.unladenWeightLbs} lbs`
                    : null
                }
              />
              <DetailItem
                label="Length"
                value={
                  vehicle.details.lengthFeet != null
                    ? `${vehicle.details.lengthFeet} ft`
                    : null
                }
              />
              <DetailItem
                label="Horsepower"
                value={
                  vehicle.details.horsepower != null
                    ? String(vehicle.details.horsepower)
                    : null
                }
              />
            </dl>

            {!vehicle.canEdit ? (
              <p className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                Shared with you · view only
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              {vehicle.canEdit && onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(vehicle)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  Edit registration
                </button>
              ) : null}
              {showRenew ? (
                <Link
                  href={`/renewals/new?registrationId=${encodeURIComponent(vehicle.id)}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  Renew registration
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
