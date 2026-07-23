"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/types";

const OPTIONS: { value: ThemePreference; label: string; description: string }[] =
  [
    {
      value: "light",
      label: "Light",
      description: "Bright backgrounds and dark text.",
    },
    {
      value: "dark",
      label: "Dark",
      description: "Dark backgrounds that are easier on the eyes at night.",
    },
    {
      value: "system",
      label: "System",
      description: "Match your device appearance setting.",
    },
  ];

export function ThemeSetting() {
  const { preference, setPreference } = useTheme();

  return (
    <ul className="mt-4 space-y-3">
      {OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <li key={option.value}>
            <button
              type="button"
              onClick={() => setPreference(option.value)}
              aria-pressed={selected}
              className={`flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                selected
                  ? "border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/40"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {option.label}
                </p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {option.description}
                </p>
              </div>
              <span
                aria-hidden
                className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${
                  selected
                    ? "border-teal-700 bg-teal-700 dark:border-teal-400 dark:bg-teal-400"
                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                }`}
              >
                {selected ? (
                  <span className="flex h-full w-full items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-950" />
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
