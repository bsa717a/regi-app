"use client";

import { FeeEstimate } from "@/components/renewals/FeeEstimate";
import type { DocumentDto } from "@/lib/documents/types";
import {
  buildRenewalReceiptHtml,
  buildRenewalReceiptText,
  renewalReceiptFilename,
  type RenewalProof,
} from "@/lib/renewals/proof";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function downloadProof(proof: RenewalProof) {
  const blob = new Blob([buildRenewalReceiptText(proof)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = renewalReceiptFilename(proof);
  link.click();
  URL.revokeObjectURL(url);
}

function printProof(proof: RenewalProof) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
  if (!popup) return;
  popup.document.write(buildRenewalReceiptHtml(proof));
  popup.document.close();
  popup.focus();
  popup.print();
}

export function RenewalReceipt({
  proof,
  documents = [],
  onViewDocument,
}: {
  proof: RenewalProof;
  documents?: DocumentDto[];
  onViewDocument?: (doc: DocumentDto) => void;
}) {
  const docsById = new Map(documents.map((doc) => [doc.id, doc]));

  return (
    <article
      data-testid="renewal-receipt"
      className="space-y-5 rounded-3xl border border-teal-200 bg-white px-4 py-5 shadow-sm dark:border-teal-800 dark:bg-slate-900"
    >
      <header>
        <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
          {proof.available ? "Sticker mailed" : "Proof not ready yet"}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {proof.available
            ? `Confirmation for ${proof.vehicleLabel}`
            : `History for ${proof.vehicleLabel}`}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {proof.available
            ? "This is REGI’s confirmation that the concierge renewal finished and the sticker was mailed. It is not a card-payment receipt."
            : "A downloadable confirmation appears after the renewal reaches Sticker Mailed."}
        </p>
      </header>

      <dl
        data-testid="renewal-receipt-facts"
        className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"
      >
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Confirmation</dt>
          <dd
            className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100"
            data-testid="renewal-confirmation-number"
          >
            {proof.confirmationNumber}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Status</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {proof.statusLabel}
          </dd>
        </div>
        {proof.plate ? (
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Plate</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">
              {proof.plate}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Sticker mailed</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {formatWhen(proof.stickerMailedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Completed</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {formatWhen(proof.completedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Requested</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-100">
            {formatWhen(proof.requestedAt)}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="renewal-status-history-heading">
        <h3
          id="renewal-status-history-heading"
          className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
        >
          Status history
        </h3>
        <ol className="mt-3 space-y-2" data-testid="renewal-status-history">
          {proof.history.map((entry) => (
            <li
              key={entry.status}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {entry.label}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {formatWhen(entry.at)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <FeeEstimate fees={proof.feeBreakdown} />

      <p
        role="note"
        data-testid="renewal-receipt-payment-note"
        className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {proof.paymentNote}
      </p>

      {proof.documents.length > 0 ? (
        <section aria-labelledby="renewal-proof-docs-heading">
          <h3
            id="renewal-proof-docs-heading"
            className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
          >
            Uploaded documents
          </h3>
          <ul className="mt-3 space-y-2">
            {proof.documents.map((doc) => {
              const full = docsById.get(doc.id);
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2.5 dark:border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800 dark:text-teal-300">
                      {doc.typeLabel}
                      {doc.isPdf ? " · PDF" : ""}
                    </p>
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {doc.filename}
                    </p>
                  </div>
                  {full && onViewDocument ? (
                    <button
                      type="button"
                      onClick={() => onViewDocument(full)}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/50"
                    >
                      View
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {proof.available ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-testid="download-renewal-receipt"
            onClick={() => downloadProof(proof)}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Download confirmation
          </button>
          <button
            type="button"
            data-testid="print-renewal-receipt"
            onClick={() => printProof(proof)}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Print / save as PDF
          </button>
        </div>
      ) : null}
    </article>
  );
}
