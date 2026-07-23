"use client";

import Link from "next/link";
import type { RegistrationDto } from "@/lib/registrations/types";
import { identityLine, titleCaseMakeModel } from "@/lib/registrations/illustrations";
import { StatusBadge } from "@/components/garage/StatusBadge";

function vehicleHeadline(vehicle: RegistrationDto): string {
  const make = titleCaseMakeModel(vehicle.make);
  const model = titleCaseMakeModel(vehicle.model);
  return [vehicle.year, make, model].filter(Boolean).join(" ") || "Registration";
}

export function RenewalCard({
  vehicle,
  prominent = false,
}: {
  vehicle: RegistrationDto;
  /** Stronger red treatment for expired registrations. */
  prominent?: boolean;
}) {
  const headline = vehicleHeadline(vehicle);
  const label = vehicle.nickname || headline;
  const expired = vehicle.status === "Expired" || prominent;

  return (
    <article
      className={`rounded-3xl border px-4 py-4 shadow-sm transition ${
        expired
          ? "border-rose-300 bg-rose-50 shadow-rose-100/80"
          : vehicle.status === "Due Soon"
            ? "border-amber-200 bg-amber-50/70 shadow-amber-100/60"
            : "border-slate-200/80 bg-white shadow-slate-200/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-slate-900">
            {label}
          </h3>
          {vehicle.nickname ? (
            <p className="mt-0.5 truncate text-sm text-slate-600">{headline}</p>
          ) : null}
          <p className="mt-1 text-sm text-slate-600">
            {identityLine(vehicle)} · {vehicle.state}
          </p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
      <p
        className={`mt-3 text-sm font-semibold ${
          expired
            ? "text-rose-800"
            : vehicle.status === "Due Soon"
              ? "text-amber-900"
              : "text-teal-800"
        }`}
      >
        {vehicle.countdown}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {vehicle.canEdit &&
        (vehicle.status === "Due Soon" || vehicle.status === "Expired") ? (
          <Link
            href={`/renewals/new?registrationId=${encodeURIComponent(vehicle.id)}`}
            className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Renew Registration
          </Link>
        ) : null}
        {!vehicle.canEdit ? (
          <span className="text-xs font-medium text-slate-600">
            View only · shared household
          </span>
        ) : null}
        <Link
          href="/garage"
          className="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          View in garage
        </Link>
      </div>
    </article>
  );
}
