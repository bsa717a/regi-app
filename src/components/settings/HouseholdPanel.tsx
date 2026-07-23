"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import {
  ApiError,
  inviteHouseholdMember,
  listHouseholds,
  removeHouseholdMember,
} from "@/lib/api/client";
import type { HouseholdDto } from "@/lib/household/types";

function roleLabel(role: string): string {
  return role === "owner" ? "Owner" : "Viewer";
}

function statusLabel(status: string): string {
  switch (status) {
    case "accepted":
      return "Active";
    case "pending":
      return "Pending invite";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

export function HouseholdPanel() {
  const { getIdToken, loading: authLoading } = useAuth();
  const [households, setHouseholds] = useState<HouseholdDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setHouseholds([]);
      setLoading(false);
      return;
    }
    const rows = await listHouseholds(token);
    setHouseholds(rows);
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function run() {
      try {
        await load();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load household members.",
          );
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, load, reloadKey]);

  const owned = households.find((h) => h.myRole === "owner");
  const shared = households.filter((h) => h.myRole === "viewer");

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setInviting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Session expired. Sign in again.");
      const result = await inviteHouseholdMember(token, {
        email: inviteEmail,
        householdId: owned?.id,
      });
      setInviteEmail("");
      setMessage(
        `Invite sent to ${result.member.email ?? inviteEmail}. They’ll see shared registrations after accepting.`,
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the invite.",
      );
    } finally {
      setInviting(false);
    }
  }

  async function onRemove(memberId: string, label: string) {
    setError(null);
    setMessage(null);
    setRemovingId(memberId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Session expired. Sign in again.");
      await removeHouseholdMember(token, memberId);
      setMessage(`Removed ${label} from the household.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove that member.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200/80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {owned ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {owned.name}
            </h3>
            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-900">
              Your role: Owner
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Invite a spouse or partner to view registrations, statuses,
            documents, and reminders. Viewers cannot edit or renew.
          </p>

          <ul className="mt-4 space-y-2" aria-label="Household members">
            {owned.members.map((member) => (
              <li
                key={member.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {member.name || member.email || "Invited member"}
                    {member.isCurrentUser ? " (you)" : ""}
                  </p>
                  {member.email && member.name ? (
                    <p className="truncate text-sm text-slate-600">
                      {member.email}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {roleLabel(member.role)} · {statusLabel(member.inviteStatus)}
                  </p>
                </div>
                {member.role !== "owner" ? (
                  <button
                    type="button"
                    className="shrink-0 text-sm font-semibold text-rose-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-50"
                    disabled={removingId === member.id}
                    onClick={() =>
                      void onRemove(
                        member.id,
                        member.email || member.name || "member",
                      )
                    }
                  >
                    {member.inviteStatus === "pending" ? "Revoke" : "Remove"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <form onSubmit={onInvite} className="mt-5 space-y-3">
            <div>
              <label htmlFor="household-invite-email" className={labelClassName}>
                Invite by email
              </label>
              <input
                id="household-invite-email"
                type="email"
                required
                autoComplete="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className={fieldClassName}
                placeholder="partner@example.com"
              />
            </div>
            <button
              type="submit"
              className={primaryButtonClassName}
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? "Sending invite…" : "Send invite"}
            </button>
          </form>
        </div>
      ) : (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          We couldn&apos;t find a household you own yet. Refresh and try again.
        </p>
      )}

      {shared.length > 0 ? (
        <div className="space-y-4 border-t border-slate-200 pt-6">
          <h3 className="text-base font-semibold text-slate-900">
            Shared with you
          </h3>
          {shared.map((hh) => (
            <div key={hh.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{hh.name}</p>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Your role: Viewer (read-only)
                </span>
              </div>
              <ul className="mt-2 space-y-2">
                {hh.members
                  .filter((m) => m.inviteStatus === "accepted")
                  .map((member) => (
                    <li
                      key={member.id}
                      className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                    >
                      <p className="font-medium text-slate-900">
                        {member.name || member.email}
                        {member.isCurrentUser ? " (you)" : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {roleLabel(member.role)}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {message ? (
        <p
          className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
