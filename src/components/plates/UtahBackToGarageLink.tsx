import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

const TEXT_CLASS =
  "inline-flex text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300";

const BUTTON_CLASS =
  "inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

export function UtahBackToGarageLink({
  variant = "text",
  testId = "plates-back-to-garage",
}: {
  variant?: "text" | "button";
  testId?: string;
}) {
  return (
    <a
      href={DEFAULT_SIGNED_IN_HOME}
      data-testid={testId}
      className={variant === "button" ? BUTTON_CLASS : TEXT_CLASS}
    >
      {variant === "text" ? "← Back to garage" : "Back to garage"}
    </a>
  );
}
