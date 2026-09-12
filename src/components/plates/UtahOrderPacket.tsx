"use client";

import { useState } from "react";
import { copyToClipboard } from "@/components/plates/copyToClipboard";
import { UtahPlatePreviewImage } from "@/components/plates/UtahPlatePreviewImage";
import { formatUsdCents } from "@/lib/renewals/formatMoney";
import {
  formatFeeEstimateCopy,
  formatMvpEntryCard,
  UTAH_PACKET_STAYS_OPEN_NOTE,
  type UtahPlateDraft,
  type UtahPlateFeeEstimate,
  type UtahPlatePreview,
} from "@/lib/plates/utah";

function PacketCopyButton({
  label,
  text,
  testId,
}: {
  label: string;
  text: string;
  testId: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (ok) {
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => void onCopy()}
      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-teal-700/30 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-teal-400/40 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-teal-950/50"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function PacketRow({
  label,
  value,
  copyLabel,
  testId,
}: {
  label: string;
  value: string;
  copyLabel: string;
  testId: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-teal-800/80 dark:text-teal-300/80">
          {label}
        </p>
        <p className="mt-0.5 break-words font-mono text-sm text-slate-900 dark:text-slate-100">
          {value}
        </p>
      </div>
      <PacketCopyButton label={copyLabel} text={value} testId={testId} />
    </div>
  );
}

export function UtahOrderPacket({
  draft,
  fees,
  preview,
}: {
  draft: UtahPlateDraft;
  fees: UtahPlateFeeEstimate;
  preview?: UtahPlatePreview | null;
}) {
  const packetText = formatMvpEntryCard(draft, fees);
  const feeCopy = formatFeeEstimateCopy(fees);
  const firstCombo = draft.combos[0] ?? "";
  const [copiedPacket, setCopiedPacket] = useState(false);

  async function copyPacket() {
    const ok = await copyToClipboard(packetText);
    setCopiedPacket(ok);
    if (ok) {
      window.setTimeout(() => setCopiedPacket(false), 2000);
    }
  }

  return (
    <section
      aria-labelledby="utah-order-packet-heading"
      data-testid="utah-order-packet"
      className="sticky top-[5.25rem] z-[5] rounded-3xl border border-teal-200 bg-teal-50/95 px-4 py-4 shadow-md shadow-slate-200/50 backdrop-blur dark:border-teal-900/70 dark:bg-teal-950/80 dark:shadow-none"
    >
      <h2
        id="utah-order-packet-heading"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-800 dark:text-teal-300"
      >
        Your order packet
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {UTAH_PACKET_STAYS_OPEN_NOTE}
      </p>

      {preview ? (
        <div className="mt-3 max-w-[220px]" data-testid="utah-order-packet-design">
          <UtahPlatePreviewImage
            preview={preview}
            characters={firstCombo}
            compact
          />
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        <PacketRow
          label="Plate design"
          value={draft.plateDesignLabel?.trim() || "Utah plate"}
          copyLabel="Copy design"
          testId="utah-copy-design"
        />
        {draft.combos.map((combo, index) => (
          <PacketRow
            key={`${combo}-${index}`}
            label={`Choice ${index + 1}`}
            value={combo}
            copyLabel="Copy"
            testId={`utah-copy-combo-${index}`}
          />
        ))}
        <PacketRow
          label="Meaning"
          value={draft.meaning.trim()}
          copyLabel="Copy meaning"
          testId="utah-copy-meaning"
        />
        {draft.last4Vin?.trim() ? (
          <PacketRow
            label="VIN last 4"
            value={draft.last4Vin.trim()}
            copyLabel="Copy VIN"
            testId="utah-copy-vin-last4"
          />
        ) : null}
        <div className="rounded-2xl bg-white/80 px-3 py-2.5 dark:bg-slate-900/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-teal-800/80 dark:text-teal-300/80">
                Fee estimate
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatUsdCents(fees.initialTotalCents)} initial
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {formatUsdCents(fees.applicationFeeCents)} application +{" "}
                {formatUsdCents(fees.processingFeeCents)} processing
                {fees.specialGroupNote
                  ? ". Special-group contribution is extra — confirm on MVP."
                  : "."}{" "}
                Estimates only.
              </p>
            </div>
            <PacketCopyButton
              label="Copy fees"
              text={feeCopy}
              testId="utah-copy-fees"
            />
          </div>
        </div>
      </div>

      <pre data-testid="utah-mvp-copy-text" className="sr-only">
        {packetText}
      </pre>
      <button
        type="button"
        data-testid="utah-copy-packet"
        onClick={() => void copyPacket()}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        {copiedPacket ? "Copied" : "Copy packet"}
      </button>
    </section>
  );
}
