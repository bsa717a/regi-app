"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateMe } from "@/lib/api/client";
import type { AuthUserProfile } from "@/lib/auth/getOrCreateUser";
import type { NotificationPrefs } from "@/lib/auth/notificationPrefs";
import { SectionLabel } from "@/components/brand/ui";
import { BrandSwitch } from "@/components/brand/ui";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { ResendVerificationEmailButton } from "@/components/auth/ResendVerificationEmailButton";
import { ThemeSetting } from "@/components/settings/ThemeSetting";
import { HouseholdPanel } from "@/components/settings/HouseholdPanel";
import { NativeSecuritySection } from "@/components/settings/NativeSecuritySection";
import { PushPrefToggle } from "@/components/settings/PushPrefToggle";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { StaffPortalLink } from "@/components/settings/StaffPortalLink";
import {
  MailingAddressFields,
  mailingAddressFormValue,
} from "@/components/account/MailingAddressFields";

export function SettingsPanel() {
  const { user, profile, profileLoading, getIdToken, refreshProfile, logOut } =
    useAuth();

  if (profileLoading && !profile) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="status">
        We couldn&apos;t load your profile yet. Try refreshing in a moment.
      </p>
    );
  }

  return (
    <SettingsForm
      key={profile.id}
      userEmail={user?.email ?? profile.email}
      emailVerified={user?.emailVerified ?? false}
      profile={profile}
      getIdToken={getIdToken}
      refreshProfile={refreshProfile}
      logOut={logOut}
    />
  );
}

function SettingsForm({
  userEmail,
  emailVerified,
  profile,
  getIdToken,
  refreshProfile,
  logOut,
}: {
  userEmail: string;
  emailVerified: boolean;
  profile: AuthUserProfile;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  refreshProfile: () => Promise<AuthUserProfile | null>;
  logOut: () => Promise<void>;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [address, setAddress] = useState(mailingAddressFormValue(profile));
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
      await updateMe(token, {
        name,
        phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        addressState: address.addressState,
        postalCode: address.postalCode,
      });
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

  const initials = (name || userEmail || "R")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-3" data-testid="settings-profile">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-regi-surface font-regi-display text-lg font-bold text-regi-text"
        >
          {initials || "R"}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-regi-display text-xl font-medium tracking-[-0.005em] text-regi-text">
            {name.trim() || "Your profile"}
          </h2>
          <p className="truncate text-sm text-regi-muted">{userEmail}</p>
          <p className="mt-1 font-regi-data text-[11px] font-bold tracking-[0.14em] text-regi-current">
            {emailVerified ? "VERIFIED" : "NOT VERIFIED"}
          </p>
        </div>
      </section>

      <NativeSecuritySection
        onMessage={setMessage}
        onError={(msg) => setError(msg || null)}
      />

      <section>
        {!emailVerified ? (
          <div
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40"
            data-testid="settings-verify-email"
          >
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Verify your email to unlock renewals. Check your inbox for a
              verification link, or request a new one below.
            </p>
            <div className="mt-2">
              <ResendVerificationEmailButton variant="link" />
            </div>
          </div>
        ) : null}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-regi-muted">
            Edit profile
          </summary>
        <form
          onSubmit={saveProfile}
          className="mt-4 space-y-4"
          data-testid="applicant-profile-form"
        >
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
              data-testid="applicant-name"
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
          <MailingAddressFields
            idPrefix="settings"
            value={address}
            onChange={setAddress}
          />
          <button
            type="submit"
            className={primaryButtonClassName}
            disabled={savingProfile}
            data-testid="save-profile-button"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
        </details>
      </section>

      <section>
        <SectionLabel>Notifications</SectionLabel>
        <ul className="mt-3 overflow-hidden rounded-[10px] border border-regi-line bg-regi-surface">
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
            description="A reminder 30, 14 and 3 days out"
            checked={prefs.email}
            disabled={savingPrefs}
            onChange={(email) => void savePrefs({ ...prefs, email })}
          />
          <PrefToggle
            id="pref-sms"
            label="SMS"
            description="Text the owner only"
            checked={prefs.sms}
            disabled={savingPrefs}
            onChange={(sms) => void savePrefs({ ...prefs, sms })}
          />
        </ul>
      </section>

      <section>
        <SectionLabel>Household</SectionLabel>
        <div className="mt-3">
          <HouseholdPanel />
        </div>
      </section>

      <section>
        <SectionLabel>Appearance</SectionLabel>
        <div className="mt-3">
          <ThemeSetting />
        </div>
      </section>

      {message ? (
        <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-100" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      <StaffPortalLink />

      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Utah plates
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Plan a personalized or specialty plate, then enter it yourself in
          Utah MVP. REGI does not submit or prefill the DMV request.
        </p>
        <Link
          href="/garage/plates"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Utah personalized / specialty plates
        </Link>
      </section>

      <section className="border-t border-slate-200 pt-6 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Legal
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          How REGI uses your data, and the terms for using the app.
        </p>
        <div className="mt-3">
          <LegalLinks />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6 dark:border-slate-700">
        <button
          type="button"
          onClick={() => void logOut()}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:outline-slate-400"
        >
          Sign out
        </button>
      </section>

      <DeleteAccountSection />
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
    <li className="flex items-center justify-between gap-4 border-b border-regi-line px-3.5 py-3 last:border-b-0">
      <div>
        <p className="text-base text-regi-text" id={`${id}-label`}>
          {label}
        </p>
        <p className="mt-0.5 text-sm text-regi-muted" id={`${id}-desc`}>
          {description}
        </p>
      </div>
      <BrandSwitch
        id={id}
        checked={checked}
        disabled={isDisabled}
        labelledBy={`${id}-label`}
        describedBy={`${id}-desc`}
        onChange={onChange}
      />
    </li>
  );
}
