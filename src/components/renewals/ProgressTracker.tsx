"use client";

import type { RenewalStatus } from "@prisma/client";
import type { ConciergeWorkflowStep } from "@/lib/stateEngine/types";
import type { RenewalTimestamps } from "@/lib/renewals/types";

const USER_FACING_STATUSES = [
  "DocumentsReceived",
  "Reviewing",
  "Processing",
  "Submitted",
  "Completed",
  "StickerMailed",
] as const satisfies readonly RenewalStatus[];

const FALLBACK_COPY: Record<
  (typeof USER_FACING_STATUSES)[number],
  { label: string; description: string }
> = {
  DocumentsReceived: {
    label: "Documents Received",
    description: "We've got your paperwork.",
  },
  Reviewing: {
    label: "Reviewing",
    description: "REGI staff is checking your documents.",
  },
  Processing: {
    label: "Processing",
    description: "We're preparing your renewal submission.",
  },
  Submitted: {
    label: "Submitted",
    description: "Sent to the state — waiting on approval.",
  },
  Completed: {
    label: "Completed",
    description: "Renewal approved. Sticker is next.",
  },
  StickerMailed: {
    label: "Sticker Mailed",
    description: "Your sticker is on its way.",
  },
};

function timestampFor(
  status: RenewalStatus,
  timestamps: RenewalTimestamps,
): string | null {
  switch (status) {
    case "DocumentsReceived":
      return timestamps.documentsReceivedAt;
    case "Reviewing":
      return timestamps.reviewingAt;
    case "Processing":
      return timestamps.processingAt;
    case "Submitted":
      return timestamps.submittedAt;
    case "Completed":
      return timestamps.completedAt;
    case "StickerMailed":
      return timestamps.stickerMailedAt;
    default:
      return null;
  }
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ProgressTracker({
  status,
  workflow,
  timestamps,
}: {
  status: RenewalStatus;
  workflow: ConciergeWorkflowStep[];
  timestamps: RenewalTimestamps;
}) {
  const byStatus = new Map(workflow.map((step) => [step.status, step]));
  const currentIndex = USER_FACING_STATUSES.indexOf(
    status === "Requested" ? "DocumentsReceived" : status,
  );
  // Requested = not yet on the post-submit tracker; highlight none as complete.
  const highlightIndex =
    status === "Requested" ? -1 : Math.max(0, currentIndex);

  return (
    <ol className="space-y-0" aria-label="Renewal progress">
      {USER_FACING_STATUSES.map((stepStatus, index) => {
        const configStep = byStatus.get(stepStatus);
        const fallback = FALLBACK_COPY[stepStatus];
        const label = configStep?.label ?? fallback.label;
        const description =
          configStep?.description ?? fallback.description;
        const done = highlightIndex > index;
        const current = highlightIndex === index;
        const when = formatWhen(timestampFor(stepStatus, timestamps));

        return (
          <li key={stepStatus} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  current
                    ? "bg-teal-700 text-white ring-4 ring-teal-100"
                    : done
                      ? "bg-teal-600 text-white"
                      : "bg-slate-200 text-slate-600"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              {index < USER_FACING_STATUSES.length - 1 ? (
                <span
                  className={`my-1 w-0.5 flex-1 min-h-6 ${
                    done ? "bg-teal-500" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className={`pb-6 ${current ? "" : ""}`}>
              <p
                className={`text-sm font-semibold ${
                  current
                    ? "text-teal-900"
                    : done
                      ? "text-slate-900"
                      : "text-slate-500"
                }`}
              >
                {label}
                {current ? (
                  <span className="ml-2 text-xs font-medium uppercase tracking-wide text-teal-700">
                    Current
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
              {when && (done || current) ? (
                <p className="mt-1 text-xs text-slate-500">{when}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
