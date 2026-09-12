"use client";

import { useState } from "react";
import { formatMvpEntryCard, type UtahPlateDraft } from "@/lib/plates/utah";

export function UtahMvpCopyCard({ draft }: { draft: UtahPlateDraft }) {
  const text = formatMvpEntryCard(draft);
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "absolute";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="utah-mvp-copy-heading"
      className="rounded-3xl border border-teal-200 bg-teal-50/70 px-4 py-4 dark:border-teal-900/70 dark:bg-teal-950/30"
    >
      <h2
        id="utah-mvp-copy-heading"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-800 dark:text-teal-300"
      >
        Enter this in MVP
      </h2>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-white px-3 py-3 text-sm leading-relaxed text-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {text}
      </pre>
      <button
        type="button"
        onClick={() => void copySummary()}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        {copied ? "Copied" : "Copy for MVP"}
      </button>
    </section>
  );
}
