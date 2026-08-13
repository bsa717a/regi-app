"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import {
  ApiError,
  getDocumentDownloadUrl,
  listDocuments,
  lookupOwnerManualApi,
  purchaseOwnerManualApi,
} from "@/lib/api/client";
import { MANUAL_PAID_LOOKUP_FEE_LABEL } from "@/lib/manuals/constants";
import type { DocumentDto } from "@/lib/documents/types";
import type { RegistrationDto } from "@/lib/registrations/types";
import {
  REGISTRATION_TYPE_LABELS,
  identityLine,
  titleCaseMakeModel,
} from "@/lib/registrations/illustrations";
import { formatMotorhomeClass } from "@/lib/registrations/motorhome";
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
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
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

  const { getIdToken, idToken } = useAuth();
  const [registrationDoc, setRegistrationDoc] = useState<DocumentDto | null>(
    null,
  );
  const [registrationDocLoading, setRegistrationDocLoading] = useState(false);
  const [registrationDocError, setRegistrationDocError] = useState<
    string | null
  >(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  const [manualUrl, setManualUrl] = useState<string | null>(
    vehicle.ownerManualUrl ?? null,
  );
  const [manualLookupLoading, setManualLookupLoading] = useState(false);
  const [manualPurchaseLoading, setManualPurchaseLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualPaidOffer, setManualPaidOffer] = useState(false);

  useEffect(() => {
    setManualUrl(vehicle.ownerManualUrl ?? null);
  }, [vehicle.ownerManualUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationDoc() {
      setRegistrationDocLoading(true);
      setRegistrationDocError(null);
      try {
        const token = idToken ?? (await getIdToken());
        if (!token || cancelled) return;

        const documents = await listDocuments(token, vehicle.id);
        if (cancelled) return;

        const doc =
          documents.find((row) => row.type === "registration") ?? null;
        setRegistrationDoc(doc);
      } catch (err) {
        if (!cancelled) {
          setRegistrationDocError(
            err instanceof ApiError
              ? err.message
              : "Could not load registration document.",
          );
        }
      } finally {
        if (!cancelled) {
          setRegistrationDocLoading(false);
        }
      }
    }

    void loadRegistrationDoc();
    return () => {
      cancelled = true;
    };
  }, [vehicle.id, idToken, getIdToken]);

  async function openRegistrationPreview() {
    if (!registrationDoc) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewFilename(registrationDoc.originalFilename);
    try {
      const token = idToken ?? (await getIdToken());
      if (!token) throw new Error("Please sign in again.");
      const signed = await getDocumentDownloadUrl(token, registrationDoc.id);
      setPreviewUrl(signed.downloadUrl);
      setPreviewFilename(signed.filename || registrationDoc.originalFilename);
    } catch (err) {
      setPreviewError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load registration document.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function closeRegistrationPreview() {
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewFilename("");
  }

  function openManualUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleFindManual() {
    setManualLookupLoading(true);
    setManualError(null);
    setManualMessage(null);
    setManualPaidOffer(false);
    try {
      const token = idToken ?? (await getIdToken());
      if (!token) throw new Error("Please sign in again.");

      const result = await lookupOwnerManualApi(token, vehicle.id);
      if (result.ok) {
        setManualUrl(result.url);
        setManualMessage(
          result.cached
            ? "Owner’s manual ready."
            : "Found a free owner’s manual.",
        );
        openManualUrl(result.url);
        return;
      }

      if (result.paidAvailable) {
        setManualPaidOffer(true);
        setManualMessage(
          result.error ||
            "We couldn’t find a free digital manual for this vehicle.",
        );
        return;
      }

      setManualError(result.error || "Could not find an owner’s manual.");
    } catch (err) {
      setManualError(
        err instanceof ApiError
          ? err.status === 404
            ? "Manual lookup is unavailable on this server. Pull the latest code, run database migrations, and restart the dev server."
            : err.message
          : err instanceof Error
            ? err.message
            : "Could not find an owner’s manual.",
      );
    } finally {
      setManualLookupLoading(false);
    }
  }

  async function handlePurchaseManual() {
    const confirmed = window.confirm(
      `You’ll be charged ${MANUAL_PAID_LOOKUP_FEE_LABEL} to look up this owner’s manual through our paid provider. Continue?`,
    );
    if (!confirmed) return;

    setManualPurchaseLoading(true);
    setManualError(null);
    setManualMessage(null);
    try {
      const token = idToken ?? (await getIdToken());
      if (!token) throw new Error("Please sign in again.");

      const result = await purchaseOwnerManualApi(token, vehicle.id);
      if (result.ok) {
        setManualUrl(result.url);
        setManualPaidOffer(false);
        setManualMessage("Payment successful. Opening your owner’s manual.");
        openManualUrl(result.url);
        return;
      }

      if ("pending" in result && result.pending) {
        setManualPaidOffer(false);
        setManualMessage(result.message);
        return;
      }

      setManualError(
        "error" in result
          ? result.error
          : "Could not complete the paid manual lookup.",
      );
    } catch (err) {
      setManualError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not complete the paid manual lookup.",
      );
    } finally {
      setManualPurchaseLoading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 transition hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-black/20">
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
            <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-200/80 backdrop-blur dark:bg-slate-900/90 dark:text-slate-100 dark:ring-slate-600/80">
              {typeLabel}
            </span>
          </div>
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <StatusBadge status={vehicle.status} />
            {(vehicle.maintenanceDueCount ?? 0) > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100/95 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200/80 backdrop-blur dark:bg-amber-950/80 dark:text-amber-100 dark:ring-amber-800/80">
                Maintenance due
              </span>
            ) : null}
            {(vehicle.openRecallCount ?? 0) > 0 ? (
              <span className="inline-flex items-center rounded-full bg-rose-100/95 px-2.5 py-1 text-xs font-semibold text-rose-900 ring-1 ring-inset ring-rose-200/80 backdrop-blur dark:bg-rose-950/80 dark:text-rose-100 dark:ring-rose-800/80">
                Open recalls
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            {vehicle.nickname ? (
              <>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {vehicle.nickname}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{headline}</p>
              </>
            ) : (
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {headline}
              </h3>
            )}
            <p
              className={`mt-2 text-sm font-medium ${
                vehicle.status === "Expired"
                  ? "text-rose-700 dark:text-rose-300"
                  : vehicle.status === "Due Soon"
                    ? "text-amber-800 dark:text-amber-200"
                    : "text-teal-800 dark:text-teal-300"
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

      {registrationDoc ? (
        <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => void openRegistrationPreview()}
            className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Registration card
          </button>
        </div>
      ) : null}

      <div
        id={detailsId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
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
                label="Motorhome class"
                value={formatMotorhomeClass(vehicle.details.motorhomeClass)}
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

            {registrationDoc ? (
              <button
                type="button"
                onClick={() => void openRegistrationPreview()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/70 sm:w-auto"
              >
                View registration card
              </button>
            ) : registrationDocLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading registration card…
              </p>
            ) : null}

            {registrationDocError ? (
              <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                {registrationDocError}
              </p>
            ) : null}

            {manualMessage ? (
              <p className="text-sm text-teal-800 dark:text-teal-200">{manualMessage}</p>
            ) : null}

            {manualError ? (
              <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                {manualError}
              </p>
            ) : null}

            {manualPaidOffer ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                <p>
                  We can look it up through a paid provider for{" "}
                  <span className="font-semibold">{MANUAL_PAID_LOOKUP_FEE_LABEL}</span>.
                </p>
                {vehicle.canEdit ? (
                  <button
                    type="button"
                    onClick={() => void handlePurchaseManual()}
                    disabled={manualPurchaseLoading}
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:opacity-60 dark:bg-amber-700 dark:hover:bg-amber-600"
                  >
                    {manualPurchaseLoading
                      ? "Processing payment…"
                      : `Pay ${MANUAL_PAID_LOOKUP_FEE_LABEL} and find manual`}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-100/80">
                    Only the household owner can purchase a manual lookup.
                  </p>
                )}
              </div>
            ) : null}

            {!vehicle.canEdit ? (
              <p className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Shared with you · view only
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {manualUrl ? (
                <a
                  href={manualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Open owner&apos;s manual
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFindManual()}
                  disabled={manualLookupLoading || manualPurchaseLoading}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {manualLookupLoading ? "Searching…" : "Find owner’s manual"}
                </button>
              )}
              <Link
                href={`/garage/${encodeURIComponent(vehicle.id)}/maintenance`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/70"
              >
                {(vehicle.maintenanceDueCount ?? 0) > 0
                  ? `Maintenance (${vehicle.maintenanceDueCount})`
                  : "Maintenance"}
              </Link>
              <Link
                href={`/garage/${encodeURIComponent(vehicle.id)}/recalls`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {(vehicle.openRecallCount ?? 0) > 0
                  ? `Recalls (${vehicle.openRecallCount})`
                  : "Recalls"}
              </Link>
              {vehicle.canEdit && onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(vehicle)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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

      <DocumentPreviewModal
        open={previewOpen}
        onClose={closeRegistrationPreview}
        categoryLabel="Registration card"
        title={label}
        filename={previewFilename || registrationDoc?.originalFilename || "registration"}
        downloadUrl={previewUrl}
        loading={previewLoading}
        error={previewError}
        onRetry={() => void openRegistrationPreview()}
      />
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
