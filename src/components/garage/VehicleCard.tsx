"use client";

import Link from "next/link";
import type { RegistrationDto } from "@/lib/registrations/types";
import {
  REGISTRATION_TYPE_LABELS,
  identityLine,
  titleCaseMakeModel,
} from "@/lib/registrations/illustrations";
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

export function VehicleCard({
  vehicle,
  onEdit,
}: {
  vehicle: RegistrationDto;
  onEdit?: (vehicle: RegistrationDto) => void;
}) {
  const make = titleCaseMakeModel(vehicle.make);
  const model = titleCaseMakeModel(vehicle.model);
  const headline = [vehicle.year, make, model].filter(Boolean).join(" ") ||
    "Registration";
  const label = vehicle.nickname || headline;
  const typeLabel = REGISTRATION_TYPE_LABELS[vehicle.type];

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 transition hover:shadow-md">
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
      <div className="space-y-2 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
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
          </div>
          {vehicle.canEdit && onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(vehicle)}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Edit
            </button>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <dt className="text-slate-500">ID</dt>
            <dd className="font-medium text-slate-900">
              {identityLine(vehicle)} · {vehicle.state}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Expires</dt>
            <dd className="font-medium text-slate-900">
              {formatExpiresOn(vehicle.registrationExpiresOn)}
            </dd>
          </div>
        </dl>
        <p
          className={`text-sm font-medium ${
            vehicle.status === "Expired"
              ? "text-rose-700"
              : vehicle.status === "Due Soon"
                ? "text-amber-800"
                : "text-teal-800"
          }`}
        >
          {vehicle.countdown}
        </p>
        {!vehicle.canEdit ? (
          <p className="mt-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            Shared with you · view only
          </p>
        ) : null}
        {vehicle.canEdit &&
        (vehicle.status === "Due Soon" || vehicle.status === "Expired") ? (
          <Link
            href={`/renewals/new?registrationId=${encodeURIComponent(vehicle.id)}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Renew Registration
          </Link>
        ) : null}
      </div>
    </article>
  );
}
