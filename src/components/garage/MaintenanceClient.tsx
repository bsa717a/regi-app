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
  createMaintenanceLog,
  createMaintenanceTask,
  createUsageReading,
  deleteMaintenanceLog,
  deleteMaintenanceTask,
  getMaintenanceOverview,
  scanMaintenanceReceipt,
  updateMaintenanceTask,
} from "@/lib/api/client";
import { prepareScanImage } from "@/lib/images/compress";
import { uploadMaintenanceReceipt } from "@/lib/maintenance/receiptUpload";
import type {
  MaintenanceDueStatus,
  MaintenanceOverviewDto,
  MaintenanceTaskDto,
} from "@/lib/maintenance/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(cents: number | null): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatInterval(task: {
  intervalMonths: number | null;
  intervalHours: number | null;
  intervalMiles: number | null;
}): string {
  const parts: string[] = [];
  if (task.intervalMonths != null) {
    parts.push(
      `every ${task.intervalMonths} month${task.intervalMonths === 1 ? "" : "s"}`,
    );
  }
  if (task.intervalHours != null) {
    parts.push(`every ${task.intervalHours} hours`);
  }
  if (task.intervalMiles != null) {
    parts.push(`every ${task.intervalMiles.toLocaleString()} miles`);
  }
  return parts.join(" · ") || "No interval";
}

function StatusPill({ status }: { status: MaintenanceDueStatus }) {
  const styles =
    status === "overdue"
      ? "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-800"
      : status === "due_soon"
        ? "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800"
        : "bg-teal-100 text-teal-900 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-800";
  const label =
    status === "overdue"
      ? "Overdue"
      : status === "due_soon"
        ? "Due soon"
        : "OK";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

export function MaintenanceClient({ registrationId }: { registrationId: string }) {
  const { getIdToken, idToken, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<MaintenanceOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [hoursInput, setHoursInput] = useState("");
  const [milesInput, setMilesInput] = useState("");

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMonths, setCustomMonths] = useState("");
  const [customHours, setCustomHours] = useState("");
  const [customMiles, setCustomMiles] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customRemindDays, setCustomRemindDays] = useState("");

  const [markDoneTask, setMarkDoneTask] = useState<MaintenanceTaskDto | null>(
    null,
  );
  const [doneDate, setDoneDate] = useState(todayIso());
  const [doneHours, setDoneHours] = useState("");
  const [doneMiles, setDoneMiles] = useState("");
  const [doneCost, setDoneCost] = useState("");
  const [doneNotes, setDoneNotes] = useState("");
  const [doneRemindDays, setDoneRemindDays] = useState("");

  const [remindTask, setRemindTask] = useState<MaintenanceTaskDto | null>(null);
  const [remindDays, setRemindDays] = useState("30");

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptTargetTask, setReceiptTargetTask] =
    useState<MaintenanceTaskDto | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null,
  );
  const [scanningReceipt, setScanningReceipt] = useState(false);

  const reload = useCallback(async () => {
    const token = idToken ?? (await getIdToken());
    if (!token) {
      setOverview(null);
      setLoading(false);
      setError("Sign in to view maintenance.");
      return;
    }
    const data = await getMaintenanceOverview(token, registrationId);
    setOverview(data);
    setError(null);
    setLoading(false);
    if (data.latestUsage?.hours != null) {
      setHoursInput(String(data.latestUsage.hours));
    }
    if (data.latestUsage?.miles != null) {
      setMilesInput(String(data.latestUsage.miles));
    }
  }, [getIdToken, idToken, registrationId]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function run() {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load maintenance.",
          );
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, reload]);

  const activeTasks = useMemo(
    () => (overview?.tasks ?? []).filter((task) => task.active),
    [overview],
  );
  const inactiveTasks = useMemo(
    () => (overview?.tasks ?? []).filter((task) => !task.active),
    [overview],
  );

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    setNotice(null);
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

  async function onSaveUsage(event: FormEvent) {
    event.preventDefault();
    const hours = hoursInput.trim() ? Number(hoursInput) : null;
    const miles = milesInput.trim() ? Number(milesInput) : null;
    const result = await withToken((token) =>
      createUsageReading(token, registrationId, {
        readingOn: todayIso(),
        hours,
        miles,
      }),
    );
    if (result) {
      setNotice("Usage reading saved.");
      await reload();
    }
  }

  async function onAddPreset(presetKey: string) {
    const result = await withToken((token) =>
      createMaintenanceTask(token, registrationId, { presetKey }),
    );
    if (result) {
      setNotice(`Added “${result.name}”.`);
      await reload();
    }
  }

  async function onAddCustom(event: FormEvent) {
    event.preventDefault();
    const result = await withToken((token) =>
      createMaintenanceTask(token, registrationId, {
        name: customName.trim(),
        intervalMonths: customMonths.trim() ? Number(customMonths) : null,
        intervalHours: customHours.trim() ? Number(customHours) : null,
        intervalMiles: customMiles.trim() ? Number(customMiles) : null,
        notes: customNotes.trim() || null,
        remindInDays: customRemindDays.trim()
          ? Number(customRemindDays)
          : null,
      }),
    );
    if (result) {
      setNotice(
        result.remindOn
          ? `Added “${result.name}”. Email reminder set for ${result.remindOn}.`
          : `Added “${result.name}”.`,
      );
      setShowAddCustom(false);
      setCustomName("");
      setCustomMonths("");
      setCustomHours("");
      setCustomMiles("");
      setCustomNotes("");
      setCustomRemindDays("");
      await reload();
    }
  }

  function clearReceiptAttachment() {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
  }

  function openMarkDone(task: MaintenanceTaskDto) {
    setMarkDoneTask(task);
    setDoneDate(todayIso());
    setDoneHours(
      overview?.latestUsage?.hours != null
        ? String(overview.latestUsage.hours)
        : "",
    );
    setDoneMiles(
      overview?.latestUsage?.miles != null
        ? String(overview.latestUsage.miles)
        : "",
    );
    setDoneCost("");
    setDoneNotes("");
    setDoneRemindDays("");
    clearReceiptAttachment();
  }

  function openReceiptCapture(task: MaintenanceTaskDto) {
    setReceiptTargetTask(task);
    receiptInputRef.current?.click();
  }

  async function onReceiptSelected(file: File | null) {
    const task = receiptTargetTask;
    setReceiptTargetTask(null);
    if (!file || !task) return;

    setScanningReceipt(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Sign in again to scan a receipt.");
        return;
      }

      const prepared = await prepareScanImage(file);
      const previewUrl = URL.createObjectURL(prepared.file);
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);

      let scanNotes = "";
      let scanDate = todayIso();
      let scanHours =
        overview?.latestUsage?.hours != null
          ? String(overview.latestUsage.hours)
          : "";
      let scanMiles =
        overview?.latestUsage?.miles != null
          ? String(overview.latestUsage.miles)
          : "";
      let scanCost = "";

      try {
        const scan = await scanMaintenanceReceipt(token, registrationId, {
          imageBase64: prepared.base64,
          mimeType: prepared.mimeType,
        });
        if (scan.performedOn) scanDate = scan.performedOn;
        if (scan.hoursAtService != null) {
          scanHours = String(scan.hoursAtService);
        }
        if (scan.milesAtService != null) {
          scanMiles = String(scan.milesAtService);
        }
        if (scan.costDollars != null) {
          scanCost = String(scan.costDollars);
        }
        if (scan.notes) scanNotes = scan.notes;
        setNotice("Receipt scanned — review the fields, then save.");
      } catch (err) {
        setNotice(
          err instanceof ApiError
            ? `${err.message} You can still fill the fields and save the photo.`
            : "Could not read the receipt. You can still fill the fields and save the photo.",
        );
      }

      setMarkDoneTask(task);
      setDoneDate(scanDate);
      setDoneHours(scanHours);
      setDoneMiles(scanMiles);
      setDoneCost(scanCost);
      setDoneNotes(scanNotes);
      setDoneRemindDays("");
      setReceiptFile(prepared.file);
      setReceiptPreviewUrl(previewUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not process that receipt photo.",
      );
    } finally {
      setScanningReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  }

  function openRemind(task: MaintenanceTaskDto) {
    setRemindTask(task);
    setRemindDays("30");
  }

  async function onSetRemind(event: FormEvent) {
    event.preventDefault();
    if (!remindTask) return;
    const days = Number(remindDays);
    if (!Number.isInteger(days) || days < 1) {
      setError("Enter a whole number of days (1–365).");
      return;
    }
    const result = await withToken((token) =>
      updateMaintenanceTask(token, registrationId, remindTask.id, {
        remindInDays: days,
      }),
    );
    if (result) {
      setNotice(
        `Email reminder set for “${remindTask.name}” on ${result.remindOn}.`,
      );
      setRemindTask(null);
      await reload();
    }
  }

  async function onClearRemind(task: MaintenanceTaskDto) {
    const result = await withToken((token) =>
      updateMaintenanceTask(token, registrationId, task.id, {
        clearRemind: true,
      }),
    );
    if (result) {
      setNotice(`Cleared reminder for “${task.name}”.`);
      await reload();
    }
  }

  async function onMarkDone(event: FormEvent) {
    event.preventDefault();
    if (!markDoneTask) return;
    const costDollars = doneCost.trim() ? Number(doneCost) : null;
    const remindInDays = doneRemindDays.trim()
      ? Number(doneRemindDays)
      : null;
    const pendingReceipt = receiptFile;
    const result = await withToken(async (token) => {
      const log = await createMaintenanceLog(token, registrationId, {
        taskId: markDoneTask.id,
        performedOn: doneDate,
        hoursAtService: doneHours.trim() ? Number(doneHours) : null,
        milesAtService: doneMiles.trim() ? Number(doneMiles) : null,
        costCents:
          costDollars != null && Number.isFinite(costDollars)
            ? Math.round(costDollars * 100)
            : null,
        notes: doneNotes.trim() || null,
      });
      if (pendingReceipt) {
        await uploadMaintenanceReceipt({
          token,
          registrationId,
          logId: log.id,
          file: pendingReceipt,
        });
      }
      if (remindInDays != null && Number.isInteger(remindInDays) && remindInDays >= 1) {
        await updateMaintenanceTask(token, registrationId, markDoneTask.id, {
          remindInDays,
        });
      }
      return log;
    });
    if (result) {
      const parts = [`Marked “${markDoneTask.name}” done.`];
      if (pendingReceipt) parts.push("Receipt saved.");
      if (remindInDays) parts.push(`Reminder set in ${remindInDays} days.`);
      setNotice(parts.join(" "));
      setMarkDoneTask(null);
      clearReceiptAttachment();
      await reload();
    }
  }

  async function onRemoveTask(task: MaintenanceTaskDto) {
    const ok = window.confirm(`Remove “${task.name}” from this vehicle?`);
    if (!ok) return;
    const result = await withToken(async (token) => {
      await deleteMaintenanceTask(token, registrationId, task.id);
      return true;
    });
    if (result) {
      setNotice(`Removed “${task.name}”.`);
      await reload();
    }
  }

  async function onRemoveLog(logId: string) {
    const ok = window.confirm("Delete this service history entry?");
    if (!ok) return;
    const result = await withToken(async (token) => {
      await deleteMaintenanceLog(token, registrationId, logId);
      return true;
    });
    if (result) {
      setNotice("Service entry deleted.");
      await reload();
    }
  }

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);

  return (
    <AppShell title="Maintenance">
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          void onReceiptSelected(file);
        }}
      />
      <section className="mx-auto max-w-lg space-y-5">
        <Link
          href="/garage"
          className="inline-flex text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
        >
          ← Back to garage
        </Link>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {overview?.vehicleName ?? "Vehicle maintenance"}
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
            Track service intervals, log hours or miles, and keep a history for
            this registration.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading maintenance…</p>
        ) : null}

        {scanningReceipt ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
            Reading receipt…
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
            <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Current usage
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {overview.latestUsage
                  ? `Last logged ${overview.latestUsage.readingOn}${
                      overview.latestUsage.hours != null
                        ? ` · ${overview.latestUsage.hours} hrs`
                        : ""
                    }${
                      overview.latestUsage.miles != null
                        ? ` · ${overview.latestUsage.miles.toLocaleString()} mi`
                        : ""
                    }`
                  : "No hours or odometer logged yet."}
              </p>

              {overview.canEdit ? (
                <form onSubmit={onSaveUsage} className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClassName} htmlFor="usage-hours">
                        Engine hours
                      </label>
                      <input
                        id="usage-hours"
                        type="number"
                        min="0"
                        step="0.1"
                        inputMode="decimal"
                        className={fieldClassName}
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                        placeholder="e.g. 42.5"
                      />
                    </div>
                    <div>
                      <label className={labelClassName} htmlFor="usage-miles">
                        Odometer (mi)
                      </label>
                      <input
                        id="usage-miles"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="decimal"
                        className={fieldClassName}
                        value={milesInput}
                        onChange={(e) => setMilesInput(e.target.value)}
                        placeholder="e.g. 12500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className={primaryButtonClassName}
                  >
                    Update reading
                  </button>
                </form>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Shared with you · view only
                </p>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Tasks
                </h3>
                <span className="text-xs font-medium text-slate-500">
                  {activeTasks.length} active
                </span>
              </div>

              {activeTasks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
                  No maintenance tasks yet. Add a preset or create a custom
                  task below.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activeTasks.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                              {task.name}
                            </h4>
                            <StatusPill status={task.status} />
                          </div>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {formatInterval(task)}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                            {task.statusDetail}
                          </p>
                          {task.lastPerformedOn ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Last done {task.lastPerformedOn}
                              {task.lastHoursAtService != null
                                ? ` @ ${task.lastHoursAtService} hrs`
                                : ""}
                              {task.lastMilesAtService != null
                                ? ` @ ${task.lastMilesAtService.toLocaleString()} mi`
                                : ""}
                            </p>
                          ) : null}
                          {task.remindOn ? (
                            <p className="mt-1 text-xs font-medium text-teal-800 dark:text-teal-300">
                              Email reminder {task.remindOn}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {overview.canEdit ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || scanningReceipt}
                            onClick={() => openMarkDone(task)}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                          >
                            Mark done
                          </button>
                          <button
                            type="button"
                            disabled={busy || scanningReceipt}
                            onClick={() => openReceiptCapture(task)}
                            aria-label={`Scan or upload receipt for ${task.name}`}
                            title="Scan or upload receipt"
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-2.5 text-teal-900 transition hover:bg-teal-100 disabled:opacity-60 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                          >
                            <CameraIcon />
                          </button>
                          <button
                            type="button"
                            disabled={busy || scanningReceipt}
                            onClick={() => openRemind(task)}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 disabled:opacity-60 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                          >
                            Remind me
                          </button>
                          {task.remindOn ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onClearRemind(task)}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            >
                              Clear reminder
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onRemoveTask(task)}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {inactiveTasks.length > 0 ? (
                <details className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
                  <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    Inactive tasks ({inactiveTasks.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                    {inactiveTasks.map((task) => (
                      <li key={task.id}>{task.name}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>

            {overview.canEdit ? (
              <section className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Add task
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Presets for this vehicle type:
                </p>
                <ul className="space-y-2">
                  {overview.presets.map((preset) => (
                    <li
                      key={preset.key}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {preset.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatInterval({
                            intervalMonths: preset.intervalMonths ?? null,
                            intervalHours: preset.intervalHours ?? null,
                            intervalMiles: preset.intervalMiles ?? null,
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy || preset.alreadyAdded}
                        onClick={() => void onAddPreset(preset.key)}
                        className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                      >
                        {preset.alreadyAdded ? "Added" : "Add"}
                      </button>
                    </li>
                  ))}
                </ul>

                {!showAddCustom ? (
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(true)}
                    className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
                  >
                    + Custom task
                  </button>
                ) : (
                  <form onSubmit={onAddCustom} className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div>
                      <label className={labelClassName} htmlFor="custom-name">
                        Task name
                      </label>
                      <input
                        id="custom-name"
                        required
                        className={fieldClassName}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. Grease hinges"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelClassName} htmlFor="custom-months">
                          Months
                        </label>
                        <input
                          id="custom-months"
                          type="number"
                          min="1"
                          className={fieldClassName}
                          value={customMonths}
                          onChange={(e) => setCustomMonths(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClassName} htmlFor="custom-hours">
                          Hours
                        </label>
                        <input
                          id="custom-hours"
                          type="number"
                          min="0.1"
                          step="0.1"
                          className={fieldClassName}
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClassName} htmlFor="custom-miles">
                          Miles
                        </label>
                        <input
                          id="custom-miles"
                          type="number"
                          min="0.1"
                          className={fieldClassName}
                          value={customMiles}
                          onChange={(e) => setCustomMiles(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClassName} htmlFor="custom-notes">
                        Notes (optional)
                      </label>
                      <input
                        id="custom-notes"
                        className={fieldClassName}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                      />
                    </div>
                    <div>
                      <label
                        className={labelClassName}
                        htmlFor="custom-remind-days"
                      >
                        Remind me in (days, optional)
                      </label>
                      <input
                        id="custom-remind-days"
                        type="number"
                        min="1"
                        max="365"
                        className={fieldClassName}
                        value={customRemindDays}
                        onChange={(e) => setCustomRemindDays(e.target.value)}
                        placeholder="e.g. 30"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        We&apos;ll email you on that day. Text reminders come
                        later.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className={primaryButtonClassName}
                      >
                        Save task
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCustom(false)}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Service history
              </h3>
              {overview.logs.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
                  No service entries yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {overview.logs.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {log.taskName ?? "One-off service"}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {log.performedOn}
                            {log.hoursAtService != null
                              ? ` · ${log.hoursAtService} hrs`
                              : ""}
                            {log.milesAtService != null
                              ? ` · ${log.milesAtService.toLocaleString()} mi`
                              : ""}
                            {formatMoney(log.costCents)
                              ? ` · ${formatMoney(log.costCents)}`
                              : ""}
                          </p>
                          {log.notes ? (
                            <p className="mt-1 text-sm text-slate-500">
                              {log.notes}
                            </p>
                          ) : null}
                          {log.receiptUrl ? (
                            <a
                              href={log.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-sm font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
                            >
                              View receipt
                              {log.receiptFilename
                                ? ` (${log.receiptFilename})`
                                : ""}
                            </a>
                          ) : null}
                        </div>
                        {overview.canEdit ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onRemoveLog(log.id)}
                            className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}

        {markDoneTask ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-done-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
          >
            <form
              onSubmit={onMarkDone}
              className="w-full max-w-md space-y-3 rounded-3xl bg-white p-5 shadow-xl dark:bg-slate-900"
            >
              <h3
                id="mark-done-title"
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                Mark “{markDoneTask.name}” done
              </h3>
              {receiptPreviewUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptPreviewUrl}
                    alt="Receipt preview"
                    className="max-h-40 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Receipt attached
                    </p>
                    <button
                      type="button"
                      onClick={() => clearReceiptAttachment()}
                      className="text-xs font-semibold text-rose-700 hover:underline"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy || scanningReceipt}
                  onClick={() => {
                    if (markDoneTask) openReceiptCapture(markDoneTask);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-3 py-3 text-sm font-semibold text-teal-900 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100"
                >
                  <CameraIcon />
                  Scan or upload receipt
                </button>
              )}
              <div>
                <label className={labelClassName} htmlFor="done-date">
                  Date performed
                </label>
                <input
                  id="done-date"
                  type="date"
                  required
                  className={fieldClassName}
                  value={doneDate}
                  onChange={(e) => setDoneDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClassName} htmlFor="done-hours">
                    Hours at service
                  </label>
                  <input
                    id="done-hours"
                    type="number"
                    min="0"
                    step="0.1"
                    className={fieldClassName}
                    value={doneHours}
                    onChange={(e) => setDoneHours(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="done-miles">
                    Miles at service
                  </label>
                  <input
                    id="done-miles"
                    type="number"
                    min="0"
                    className={fieldClassName}
                    value={doneMiles}
                    onChange={(e) => setDoneMiles(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClassName} htmlFor="done-cost">
                  Cost (USD, optional)
                </label>
                <input
                  id="done-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClassName}
                  value={doneCost}
                  onChange={(e) => setDoneCost(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="done-notes">
                  Notes (optional)
                </label>
                <input
                  id="done-notes"
                  className={fieldClassName}
                  value={doneNotes}
                  onChange={(e) => setDoneNotes(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="done-remind-days">
                  Remind me again in (days, optional)
                </label>
                <input
                  id="done-remind-days"
                  type="number"
                  min="1"
                  max="365"
                  className={fieldClassName}
                  value={doneRemindDays}
                  onChange={(e) => setDoneRemindDays(e.target.value)}
                  placeholder="e.g. 15"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Email reminder. Text comes later.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className={primaryButtonClassName}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMarkDoneTask(null);
                    clearReceiptAttachment();
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {remindTask ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remind-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
          >
            <form
              onSubmit={onSetRemind}
              className="w-full max-w-md space-y-3 rounded-3xl bg-white p-5 shadow-xl dark:bg-slate-900"
            >
              <h3
                id="remind-title"
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                Remind me about “{remindTask.name}”
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We&apos;ll email you on that day. Text reminders come later.
              </p>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setRemindDays(String(days))}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${
                      remindDays === String(days)
                        ? "bg-teal-700 text-white ring-teal-700"
                        : "bg-slate-50 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
              <div>
                <label className={labelClassName} htmlFor="remind-days">
                  Days from today
                </label>
                <input
                  id="remind-days"
                  type="number"
                  min="1"
                  max="365"
                  required
                  className={fieldClassName}
                  value={remindDays}
                  onChange={(e) => setRemindDays(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className={primaryButtonClassName}
                >
                  Set email reminder
                </button>
                <button
                  type="button"
                  onClick={() => setRemindTask(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function CameraIcon() {
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
      <path d="M4 8h3l2-3h6l2 3h3v11H4V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
