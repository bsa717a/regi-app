"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell/AppShell";
import {
  ApiError,
  getRecallsOverview,
  refreshRecalls,
  updateRecall,
} from "@/lib/api/client";
import type {
  RecallStatus,
  RecallsOverviewDto,
  RegistrationRecallDto,
} from "@/lib/recalls/types";

const NHTSA_VIN_SEARCH = "https://www.nhtsa.gov/recalls";

function formatCheckedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: RecallStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "completed":
      return "Completed";
    case "not_applicable":
      return "Not applicable";
    default:
      return status;
  }
}

function StatusPill({ status }: { status: RecallStatus }) {
  const styles =
    status === "open"
      ? "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-800"
      : status === "completed"
        ? "bg-teal-100 text-teal-900 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-800"
        : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function RecallCard({
  recall,
  canEdit,
  busy,
  onStatusChange,
  onSaveNotes,
}: {
  recall: RegistrationRecallDto;
  canEdit: boolean;
  busy: boolean;
  onStatusChange: (recallId: string, status: RecallStatus) => Promise<void>;
  onSaveNotes: (recallId: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(recall.userNotes ?? "");
  const [expanded, setExpanded] = useState(recall.status === "open");

  async function handleNotesSubmit(event: FormEvent) {
    event.preventDefault();
    await onSaveNotes(recall.id, notes.trim());
  }

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={recall.status} />
            {recall.parkIt ? (
              <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white">
                Do not drive
              </span>
            ) : null}
            {recall.parkOutside ? (
              <span className="inline-flex items-center rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-bold text-white">
                Park outside
              </span>
            ) : null}
          </div>
          <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {recall.component ?? "Safety recall"}
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Campaign {recall.nhtsaCampaignNumber}
            {recall.reportReceivedDate
              ? ` · Reported ${recall.reportReceivedDate}`
              : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 text-sm font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          aria-expanded={expanded}
        >
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
          {recall.summary ? (
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Summary
              </p>
              <p className="mt-1">{recall.summary}</p>
            </div>
          ) : null}
          {recall.consequence ? (
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Risk
              </p>
              <p className="mt-1">{recall.consequence}</p>
            </div>
          ) : null}
          {recall.remedy ? (
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Remedy
              </p>
              <p className="mt-1">{recall.remedy}</p>
            </div>
          ) : null}
          {recall.notesFromNhtsa ? (
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                NHTSA notes
              </p>
              <p className="mt-1">{recall.notesFromNhtsa}</p>
            </div>
          ) : null}

          {canEdit ? (
            <form onSubmit={(event) => void handleNotesSubmit(event)} className="space-y-2">
              <label className={labelClassName} htmlFor={`notes-${recall.id}`}>
                Your notes
              </label>
              <textarea
                id={`notes-${recall.id}`}
                rows={2}
                className={fieldClassName}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Dealer appointment, repair date, etc."
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
              >
                Save notes
              </button>
            </form>
          ) : recall.userNotes ? (
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Notes
              </p>
              <p className="mt-1">{recall.userNotes}</p>
            </div>
          ) : null}

          {canEdit ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {recall.status !== "completed" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onStatusChange(recall.id, "completed")}
                  className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  Mark completed
                </button>
              ) : null}
              {recall.status !== "not_applicable" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onStatusChange(recall.id, "not_applicable")}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  Not applicable
                </button>
              ) : null}
              {recall.status !== "open" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onStatusChange(recall.id, "open")}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  Reopen
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function RecallsClient({ registrationId }: { registrationId: string }) {
  const { getIdToken, idToken, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<RecallsOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const autoRefreshAttempted = useRef(false);

  const reload = useCallback(async () => {
    const token = idToken ?? (await getIdToken());
    if (!token) {
      setOverview(null);
      setLoading(false);
      setError("Sign in to view recalls.");
      return null;
    }
    const data = await getRecallsOverview(token, registrationId);
    setOverview(data);
    setError(null);
    setLoading(false);
    return data;
  }, [getIdToken, idToken, registrationId]);

  const runRefresh = useCallback(async () => {
    const token = idToken ?? (await getIdToken());
    if (!token) {
      setError("Sign in to check recalls.");
      return;
    }
    setRefreshing(true);
    setError(null);
    setNotice(null);
    try {
      const data = await refreshRecalls(token, registrationId);
      setOverview(data);
      setNotice(
        data.recalls.length === 0
          ? "No recalls found for this year, make, and model."
          : `Found ${data.recalls.length} recall campaign${data.recalls.length === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not check recalls.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [getIdToken, idToken, registrationId]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function run() {
      try {
        const data = await reload();
        if (
          cancelled ||
          !data ||
          autoRefreshAttempted.current ||
          data.recallsCheckedAt ||
          !data.eligibility.eligible ||
          !data.canEdit
        ) {
          return;
        }
        autoRefreshAttempted.current = true;
        await runRefresh();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load recalls.",
          );
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, reload, runRefresh]);

  const openRecalls = useMemo(
    () =>
      (overview?.recalls ?? []).filter(
        (recall) =>
          recall.status === "open" &&
          overview?.recallsCheckedAt &&
          recall.lastSeenAt >= overview.recallsCheckedAt,
      ),
    [overview],
  );
  const resolvedRecalls = useMemo(
    () =>
      (overview?.recalls ?? []).filter((recall) => recall.status !== "open"),
    [overview],
  );

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Sign in again to continue.");
        return null;
      }
      return await fn(token);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Try again.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(recallId: string, status: RecallStatus) {
    const updated = await withToken((token) =>
      updateRecall(token, registrationId, recallId, { status }),
    );
    if (updated) {
      await reload();
    }
  }

  async function handleSaveNotes(recallId: string, notes: string) {
    const updated = await withToken((token) =>
      updateRecall(token, registrationId, recallId, { userNotes: notes || null }),
    );
    if (updated) {
      setOverview((current) =>
        current
          ? {
              ...current,
              recalls: current.recalls.map((recall) =>
                recall.id === recallId ? updated : recall,
              ),
            }
          : current,
      );
      setNotice("Notes saved.");
    }
  }

  const checkedLabel = formatCheckedAt(overview?.recallsCheckedAt ?? null);

  return (
    <AppShell title="Recalls">
      <section className="mx-auto max-w-lg space-y-5">
        <Link
          href="/garage"
          className="inline-flex text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
        >
          ← Back to garage
        </Link>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {overview?.vehicleName ?? "Vehicle recalls"}
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
            Safety campaigns from NHTSA for this year, make, and model.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Important</p>
          <p className="mt-1">
            Results match your vehicle&apos;s year, make, and model — not your
            specific VIN. A listed recall may not apply to your vehicle, and
            marking one completed here does not confirm a dealer repair.
          </p>
          {overview?.vin ? (
            <a
              href={NHTSA_VIN_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex font-semibold text-amber-900 underline underline-offset-4 dark:text-amber-100"
            >
              Check this VIN on NHTSA →
            </a>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading recalls…
          </p>
        ) : null}

        {error ? (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
            {notice}
          </p>
        ) : null}

        {overview ? (
          <>
            {!overview.eligibility.eligible ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300">
                <p>{overview.eligibility.reason}</p>
                {overview.vin ? (
                  <a
                    href={NHTSA_VIN_SEARCH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex font-semibold text-teal-800 underline underline-offset-4 dark:text-teal-300"
                  >
                    Search by VIN on NHTSA →
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {checkedLabel
                    ? `Last checked ${checkedLabel}`
                    : "Not checked yet"}
                  {overview.openCount > 0
                    ? ` · ${overview.openCount} open`
                    : overview.recallsCheckedAt
                      ? " · none open"
                      : null}
                </p>
                {overview.canEdit ? (
                  <button
                    type="button"
                    disabled={refreshing || busy}
                    onClick={() => void runRefresh()}
                    className={primaryButtonClassName}
                  >
                    {refreshing ? "Checking…" : "Check for recalls"}
                  </button>
                ) : null}
              </div>
            )}

            {overview.eligibility.eligible && openRecalls.length > 0 ? (
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Open recalls ({openRecalls.length})
                </h3>
                {openRecalls.map((recall) => (
                  <RecallCard
                    key={recall.id}
                    recall={recall}
                    canEdit={overview.canEdit}
                    busy={busy}
                    onStatusChange={handleStatusChange}
                    onSaveNotes={handleSaveNotes}
                  />
                ))}
              </section>
            ) : overview.eligibility.eligible && overview.recallsCheckedAt ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No open recalls for this year, make, and model.
              </p>
            ) : null}

            {resolvedRecalls.length > 0 ? (
              <section className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowResolved((value) => !value)}
                  className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
                  aria-expanded={showResolved}
                >
                  {showResolved ? "Hide" : "Show"} completed / not applicable (
                  {resolvedRecalls.length})
                </button>
                {showResolved
                  ? resolvedRecalls.map((recall) => (
                      <RecallCard
                        key={recall.id}
                        recall={recall}
                        canEdit={overview.canEdit}
                        busy={busy}
                        onStatusChange={handleStatusChange}
                        onSaveNotes={handleSaveNotes}
                      />
                    ))
                  : null}
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
