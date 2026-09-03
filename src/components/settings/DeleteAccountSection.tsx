"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, deleteMyAccount } from "@/lib/api/client";
import { setBiometricUnlockEnabled } from "@/lib/capacitor/biometric";
import { DELETE_ACCOUNT_CONFIRMATION } from "@/lib/account/constants";
import { fieldClassName, labelClassName } from "@/components/auth/AuthFormStyles";

export function DeleteAccountSection() {
  const { getIdToken, logOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed =
    confirmText.trim().toUpperCase() === DELETE_ACCOUNT_CONFIRMATION;

  async function onDelete() {
    setError(null);
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Session expired. Sign in again.");
      await deleteMyAccount(token);
      try {
        await setBiometricUnlockEnabled(false);
      } catch {
        // Local Face ID flag is best-effort after the account is already gone.
      }
      await logOut();
      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not delete your account.",
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="border-t border-slate-200 pt-6 dark:border-slate-700">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Delete account
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Permanently remove your REGI account, owned garage, documents, and
        sign-in. This cannot be undone. Shared household files you uploaded
        stay with the household owner.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-base font-semibold text-red-800 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 dark:focus-visible:outline-red-400"
        >
          Delete account
        </button>
      ) : (
        <div className="mt-4 space-y-4 rounded-2xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900 dark:bg-red-950/30">
          <div>
            <label htmlFor="delete-account-confirm" className={labelClassName}>
              Type {DELETE_ACCOUNT_CONFIRMATION} to confirm
            </label>
            <input
              id="delete-account-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={fieldClassName}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={submitting}
            />
          </div>
          {error ? (
            <p
              className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={!confirmed || submitting}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-red-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
            >
              {submitting ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              disabled={submitting}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
