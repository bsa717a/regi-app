"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateMe } from "@/lib/api/client";
import type { AuthUserProfile } from "@/lib/auth/getOrCreateUser";
import type { NotificationPrefs } from "@/lib/auth/notificationPrefs";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { HouseholdPanel } from "@/components/settings/HouseholdPanel";
import { PushPrefToggle } from "@/components/settings/PushPrefToggle";

export function SettingsPanel() {
  const { user, profile, profileLoading, getIdToken, refreshProfile, logOut } =
    useAuth();

  if (profileLoading && !profile) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200/80" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
        We couldn&apos;t load your profile yet. Try refreshing in a moment.
      </p>
    );
  }

  return (
    <SettingsForm
      key={profile.id}
      userEmail={user?.email ?? profile.email}
      profile={profile}
      getIdToken={getIdToken}
      refreshProfile={refreshProfile}
      logOut={logOut}
    />
  );
}

function SettingsForm({
  userEmail,
  profile,
  getIdToken,
  refreshProfile,
  logOut,
}: {
  userEmail: string;
  profile: AuthUserProfile;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  refreshProfile: () => Promise<AuthUserProfile | null>;
  logOut: () => Promise<void>;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    profile.notificationPrefs,
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSavingProfile(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Session expired. Sign in again.");
      await updateMe(token, { name, phone });
      await refreshProfile();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePrefs(next: NotificationPrefs) {
    setError(null);
    setMessage(null);
    setSavingPrefs(true);
    setPrefs(next);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Session expired. Sign in again.");
      await updateMe(token, { notificationPrefs: next });
      await refreshProfile();
      setMessage("Notification preferences saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update notification preferences.",
      );
      setPrefs(profile.notificationPrefs);
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <p className="mt-1 text-sm text-slate-600">Signed in as {userEmail}</p>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div>
            <label htmlFor="settings-name" className={labelClassName}>
              Name
            </label>
            <input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClassName}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="settings-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="settings-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClassName}
              autoComplete="tel"
            />
          </div>
          <button
            type="submit"
            className={primaryButtonClassName}
            disabled={savingProfile}
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Household</h2>
        <p className="mt-1 text-sm text-slate-600">
          Share your garage with a spouse or partner. They can view and get
          reminders — only you can edit or renew.
        </p>
        <div className="mt-4">
          <HouseholdPanel />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose how REGI nudges you before a registration expires.
        </p>
        <ul className="mt-4 space-y-3">
          <PushPrefToggle
            prefs={prefs}
            disabled={savingPrefs}
            getIdToken={getIdToken}
            onPrefsChange={setPrefs}
            onMessage={setMessage}
            onError={(msg) => setError(msg || null)}
          />
          <PrefToggle
            id="pref-email"
            label="Email"
            description="Friendly reminders in your inbox."
            checked={prefs.email}
            disabled={savingPrefs}
            onChange={(email) => void savePrefs({ ...prefs, email })}
          />
          <PrefToggle
            id="pref-sms"
            label="SMS"
            description="Text reminders."
            checked={prefs.sms}
            disabled
            comingSoon
            onChange={(sms) => void savePrefs({ ...prefs, sms })}
          />
        </ul>
      </section>

      {message ? (
        <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <section className="border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => void logOut()}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}

function PrefToggle({
  id,
  label,
  description,
  checked,
  disabled,
  comingSoon,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onChange: (value: boolean) => void;
}) {
  const isDisabled = Boolean(disabled || comingSoon);

  return (
    <li className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900" id={`${id}-label`}>
            {label}
          </p>
          {comingSoon ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Coming soon
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-slate-600" id={`${id}-desc`}>
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        disabled={isDisabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-teal-700" : "bg-slate-300"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </li>
  );
}
