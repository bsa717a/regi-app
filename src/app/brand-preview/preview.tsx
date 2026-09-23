"use client";

import { useMemo, useState } from "react";
import { AppFrame, PreviewNav } from "@/components/shell/AppShell";
import { GarageComplianceBanner } from "@/components/brand/GarageComplianceBanner";
import { GarageVehicleFace } from "@/components/brand/GarageVehicleFace";
import { RenewalsInbox, type RenewalListItem } from "@/components/brand/RenewalsInbox";
import {
  headerActionClassName,
  primaryActionClassName,
  secondaryActionClassName,
  SectionLabel,
  BrandSwitch,
} from "@/components/brand/ui";
import { GarageEmptyState } from "@/components/garage/GarageEmptyState";
import {
  garageComplianceBanner,
  registrationCountLabel,
} from "@/lib/registrations/brandCopy";
import { registrationTypeArtUrl } from "@/lib/registrations/illustrations";
import type { RegistrationStatus } from "@/lib/stateEngine/status";

type Screen = "garage" | "renewals" | "documents" | "settings";
type GarageMode = "current" | "expired" | "empty";

type Vehicle = {
  id: string;
  nickname: string;
  year: number;
  make: string;
  model: string;
  detail: string;
  status: RegistrationStatus;
  daysUntilExpiration: number;
  registrationExpiresOn: string;
  state: string;
  art: "passenger" | "trailer" | "boat";
};

const CURRENT: Vehicle[] = [
  {
    id: "trembleton",
    nickname: "Trembleton",
    year: 2022,
    make: "Ford",
    model: "F-150",
    detail: "2022 F-150",
    status: "Current",
    daysUntilExpiration: 373,
    registrationExpiresOn: "2027-09-30",
    state: "UT",
    art: "passenger",
  },
  {
    id: "twig",
    nickname: "Twig",
    year: 2013,
    make: "Volkswagen",
    model: "Touareg",
    detail: "2013 Touareg",
    status: "Current",
    daysUntilExpiration: 373,
    registrationExpiresOn: "2027-09-30",
    state: "UT",
    art: "passenger",
  },
];

const EXPIRED: Vehicle[] = [
  {
    ...CURRENT[1]!,
    status: "Expired",
    daysUntilExpiration: -63,
    registrationExpiresOn: "2026-07-21",
  },
  CURRENT[0]!,
];

const DOCS = [
  { id: "d1", title: "Registration card", vehicle: "Trembleton", date: "12 Mar 2026", kind: "PDF", vehicleId: "trembleton" },
  { id: "d2", title: "Insurance", vehicle: "Trembleton", date: "02 Jan 2026", kind: "PDF", vehicleId: "trembleton" },
  { id: "d3", title: "Emissions certificate", vehicle: "Twig", date: "09 Nov 2025", kind: "PDF", vehicleId: "twig" },
  { id: "d4", title: "Title", vehicle: "Twig", date: "09 Nov 2025", kind: "PDF", vehicleId: "twig" },
  { id: "d5", title: "Bill of sale", vehicle: "Shop trailer 04", date: "04 Aug 2025", kind: "PDF", vehicleId: "trailer" },
  { id: "d6", title: "Registration card", vehicle: "Powerquest", date: "21 Jul 2025", kind: "PDF", vehicleId: "boat" },
];

const UTAH_FEES = {
  registrationFeeCents: 4400,
  regiServiceFeeCents: 2500,
  lateFeeCents: 1000,
  lateFeeStartsAfterDays: 0,
};

function toRenewal(vehicle: Vehicle): RenewalListItem {
  return {
    id: vehicle.id,
    nickname: vehicle.nickname,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    status: vehicle.status,
    daysUntilExpiration: vehicle.daysUntilExpiration,
    registrationExpiresOn: vehicle.registrationExpiresOn,
    state: vehicle.state,
    canEdit: true,
    detail: vehicle.detail,
  };
}

export function BrandPreview() {
  const [screen, setScreen] = useState<Screen>("garage");
  const [garageMode, setGarageMode] = useState<GarageMode>("current");
  const [docFilter, setDocFilter] = useState("all");
  const [prefs, setPrefs] = useState({ push: true, email: true, sms: false });
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const [renewNote, setRenewNote] = useState<string | null>(null);
  const [emptyStep, setEmptyStep] = useState<"home" | "scan" | "vin">("home");
  const [vin, setVin] = useState("");
  const [vinNote, setVinNote] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const vehicles = garageMode === "expired" ? EXPIRED : CURRENT;
  const href =
    screen === "garage"
      ? "/garage"
      : screen === "renewals"
        ? "/renewals"
        : screen === "documents"
          ? "/documents"
          : "/settings";
  const title =
    screen === "garage"
      ? "Garage"
      : screen === "renewals"
        ? "Renewals"
        : screen === "documents"
          ? "Documents"
          : "Settings";

  const docs = useMemo(() => {
    if (docFilter === "all") return DOCS;
    return DOCS.filter((doc) => doc.vehicleId === docFilter);
  }, [docFilter]);

  const banner = garageComplianceBanner(vehicles);

  return (
    <div className="min-h-screen bg-black">
      <div
        className="flex flex-wrap gap-2 bg-neutral-900 p-3 text-sm text-white"
        data-testid="brand-scenario"
      >
        {(
          [
            ["current", "Current garage"],
            ["expired", "Out of compliance"],
            ["empty", "Empty garage"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className="rounded bg-neutral-700 px-2 py-1"
            onClick={() => {
              setGarageMode(mode);
              setScreen("garage");
              setEmptyStep("home");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div id="brand-phone" className="mx-auto min-h-screen w-full max-w-[430px] bg-regi-ground">
        <AppFrame
          title={title}
          showAssistant={false}
          nav={
            <PreviewNav
              activeHref={href}
              onNavigate={(next) => {
                if (next === "/garage") setScreen("garage");
                if (next === "/renewals") setScreen("renewals");
                if (next === "/documents") setScreen("documents");
                if (next === "/settings") setScreen("settings");
              }}
            />
          }
          action={
            screen === "documents" ? (
              <button
                type="button"
                className={headerActionClassName}
                onClick={() => setUploadOpen(true)}
              >
                Upload
              </button>
            ) : screen === "garage" && garageMode !== "empty" ? (
              <button
                type="button"
                className={headerActionClassName}
                data-testid="add-vehicle-button"
                onClick={() => setEmptyStep("vin")}
              >
                Add
              </button>
            ) : screen === "renewals" ? (
              <button type="button" className={headerActionClassName} onClick={() => setScreen("garage")}>
                Add
              </button>
            ) : null
          }
        >
          {screen === "garage" && garageMode === "empty" && emptyStep === "home" ? (
            <GarageEmptyState
              onScanCard={() => setEmptyStep("scan")}
              onEnterVin={() => setEmptyStep("vin")}
            />
          ) : null}

          {screen === "garage" && emptyStep === "scan" ? (
            <div className="space-y-4">
              <h2 className="font-regi-display text-2xl font-bold text-regi-text">
                Scan a registration card
              </h2>
              <p className="text-sm text-regi-muted">
                Take a photo of the card. REGI reads the plate, VIN, and expiry.
              </p>
              <label className={primaryActionClassName}>
                Choose a photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  data-testid="preview-scan-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setScanNote(file ? `Reading ${file.name}` : null);
                  }}
                />
              </label>
              {scanNote ? <p role="status">{scanNote}</p> : null}
            </div>
          ) : null}

          {screen === "garage" && emptyStep === "vin" ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setVinNote(vin.trim() ? `Looking up ${vin.trim()}` : "Enter a VIN");
              }}
            >
              <h2 className="font-regi-display text-2xl font-bold text-regi-text">
                Enter a VIN
              </h2>
              <label className="block text-sm text-regi-muted" htmlFor="preview-vin">
                VIN
              </label>
              <input
                id="preview-vin"
                value={vin}
                onChange={(event) => setVin(event.target.value.toUpperCase())}
                className="w-full rounded-[6px] border border-regi-line bg-regi-surface px-3 py-3 font-regi-data tracking-[0.02em] text-regi-text outline-none focus:outline focus:outline-2 focus:outline-regi-accent"
                maxLength={17}
                autoComplete="off"
              />
              <button type="submit" className={primaryActionClassName}>
                Look up VIN
              </button>
              {vinNote ? <p role="status">{vinNote}</p> : null}
              <button type="button" className={secondaryActionClassName} onClick={() => setEmptyStep("home")}>
                Back
              </button>
            </form>
          ) : null}

          {screen === "garage" && garageMode !== "empty" && emptyStep === "home" && banner ? (
            <div className="space-y-3">
              <GarageComplianceBanner banner={banner} />
              <SectionLabel>{registrationCountLabel(vehicles.length)}</SectionLabel>
              <ul className="space-y-3">
                {vehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <GarageVehicleFace
                      title={vehicle.nickname}
                      subtitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      status={vehicle.status}
                      daysUntilExpiration={vehicle.daysUntilExpiration}
                      media={
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={registrationTypeArtUrl(vehicle.art)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {screen === "renewals" ? (
            <div className="space-y-3">
              <RenewalsInbox
                vehicles={EXPIRED.map(toRenewal)}
                feeSchedule={UTAH_FEES}
                onRenew={(vehicle) => setRenewNote(`Renewal started for ${vehicle.nickname}`)}
              />
              {renewNote ? (
                <p role="status" data-testid="renew-note">
                  {renewNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {screen === "documents" ? (
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter by registration">
                {[
                  ["all", "All"],
                  ["twig", "Twig"],
                  ["trembleton", "Trembleton"],
                  ["trailer", "Trailer"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={docFilter === id}
                    onClick={() => setDocFilter(id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                      docFilter === id
                        ? "bg-regi-accent font-medium text-regi-ground"
                        : "border border-regi-line text-regi-text"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SectionLabel>
                {docs.length} document{docs.length === 1 ? "" : "s"} · newest first
              </SectionLabel>
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id} className="rounded-[10px] border border-regi-line bg-regi-surface px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base text-regi-text">{doc.title}</p>
                        <p className="text-sm text-regi-muted">
                          {doc.vehicle} · {doc.date}
                        </p>
                      </div>
                      <span className="rounded-[6px] border border-regi-line px-2 py-1 font-regi-data text-[11px] text-regi-muted">
                        {doc.kind}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {uploadOpen ? (
                <p role="status" data-testid="upload-open">
                  Upload a document for a vehicle in this garage.
                </p>
              ) : null}
            </div>
          ) : null}

          {screen === "settings" ? (
            <div className="space-y-8">
              <section className="flex items-center gap-3" data-testid="settings-profile">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-regi-surface font-regi-display text-lg font-bold">
                  GG
                </span>
                <div>
                  <h2 className="font-regi-display text-xl font-medium">Gabriel Gledhill</h2>
                  <p className="text-sm text-regi-muted">gabe@regireg.com</p>
                  <p className="mt-1 font-regi-data text-[11px] font-bold tracking-[0.14em] text-regi-current">
                    VERIFIED
                  </p>
                </div>
              </section>
              <section>
                <SectionLabel>Notifications</SectionLabel>
                <ul className="mt-3 overflow-hidden rounded-[10px] border border-regi-line bg-regi-surface">
                  <SettingRow
                    id="preview-push"
                    label="Push"
                    description="Renewal and maintenance alerts"
                    checked={prefs.push}
                    onChange={(push) => setPrefs((current) => ({ ...current, push }))}
                  />
                  <SettingRow
                    id="preview-email"
                    label="Email"
                    description="A reminder 30, 14 and 3 days out"
                    checked={prefs.email}
                    onChange={(email) => setPrefs((current) => ({ ...current, email }))}
                  />
                  <SettingRow
                    id="preview-sms"
                    label="SMS"
                    description="Text the owner only"
                    checked={prefs.sms}
                    onChange={(sms) => setPrefs((current) => ({ ...current, sms }))}
                  />
                </ul>
              </section>
              <section>
                <SectionLabel>Household</SectionLabel>
                <div className="mt-3 overflow-hidden rounded-[10px] border border-regi-line bg-regi-surface">
                  <div className="border-b border-regi-line px-3.5 py-3">
                    <p>My Household</p>
                    <p className="text-sm text-regi-muted">2 members</p>
                    <p className="text-sm text-regi-muted">You are the owner</p>
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3.5 py-3 text-left"
                    onClick={() => setInviteOpen((open) => !open)}
                    aria-expanded={inviteOpen}
                  >
                    <span>
                      <span className="block">Invite a partner</span>
                      <span className="text-sm text-regi-muted">They can view and get reminders</span>
                    </span>
                    <span aria-hidden>›</span>
                  </button>
                  {inviteOpen ? (
                    <form
                      className="space-y-3 border-t border-regi-line px-3.5 py-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setInviteNote(`Invite sent to ${inviteEmail}`);
                      }}
                    >
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="partner@example.com"
                        className="w-full rounded-[6px] border border-regi-line bg-regi-ground px-3 py-3 text-regi-text"
                        aria-label="Invite by email"
                      />
                      <button type="submit" className={primaryActionClassName}>
                        Send invite
                      </button>
                    </form>
                  ) : null}
                  {inviteNote ? <p className="px-3.5 py-2 text-sm" role="status">{inviteNote}</p> : null}
                </div>
              </section>
              <section>
                <SectionLabel>Appearance</SectionLabel>
                <ul className="mt-3 overflow-hidden rounded-[10px] border border-regi-line bg-regi-surface">
                  {(
                    [
                      ["system", "System", "Match your device"],
                      ["light", "Light", "Bright backgrounds and dark text."],
                      ["dark", "Dark", "The Operator palette, always."],
                    ] as const
                  ).map(([value, label, description]) => (
                    <li key={value} className="border-b border-regi-line last:border-b-0">
                      <button
                        type="button"
                        aria-pressed={theme === value}
                        onClick={() => setTheme(value)}
                        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
                      >
                        <span>
                          <span className="block">{label}</span>
                          <span className="text-sm text-regi-muted">{description}</span>
                        </span>
                        <span className={`h-2.5 w-2.5 rounded-full ${theme === value ? "bg-regi-text" : "bg-regi-line"}`} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
        </AppFrame>
      </div>
    </div>
  );
}

function SettingRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-regi-line px-3.5 py-3 last:border-b-0">
      <div>
        <p id={`${id}-label`}>{label}</p>
        <p id={`${id}-desc`} className="text-sm text-regi-muted">
          {description}
        </p>
      </div>
      <BrandSwitch
        id={id}
        checked={checked}
        labelledBy={`${id}-label`}
        describedBy={`${id}-desc`}
        onChange={onChange}
      />
    </li>
  );
}
