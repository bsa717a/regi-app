"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/types";

const OPTIONS: { value: ThemePreference; label: string; description: string }[] =
  [
    {
      value: "system",
      label: "System",
      description: "Match your device",
    },
    {
      value: "light",
      label: "Light",
      description: "Bright backgrounds and dark text.",
    },
    {
      value: "dark",
      label: "Dark",
      description: "The Operator palette, always.",
    },
  ];

export function ThemeSetting() {
  const { preference, setPreference } = useTheme();

  return (
    <ul className="overflow-hidden rounded-[10px] border border-regi-line bg-regi-surface">
      {OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <li key={option.value} className="border-b border-regi-line last:border-b-0">
            <button
              type="button"
              onClick={() => setPreference(option.value)}
              aria-pressed={selected}
              className="flex w-full items-center justify-between gap-4 px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-regi-accent"
            >
              <div>
                <p className="text-base text-regi-text">{option.label}</p>
                <p className="mt-0.5 text-sm text-regi-muted">{option.description}</p>
              </div>
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  selected ? "bg-regi-text" : "bg-regi-line"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
