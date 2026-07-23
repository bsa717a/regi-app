"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeClass,
  persistThemePreference,
  readInitialResolvedTheme,
  readInitialThemePreference,
} from "@/lib/theme/script";
import type { ResolvedTheme, ThemePreference } from "@/lib/theme/types";
import { resolveTheme } from "@/lib/theme/types";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    readInitialThemePreference,
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(
    readInitialResolvedTheme,
  );

  useEffect(() => {
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const prefersDark = media.matches;
      setResolved(resolveTheme("system", prefersDark));
      applyThemeClass("system", prefersDark);
    };

    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference(next) {
        const prefersDark = getSystemPrefersDark();
        setPreferenceState(next);
        setResolved(resolveTheme(next, prefersDark));
        applyThemeClass(next, prefersDark);
        try {
          persistThemePreference(next);
        } catch {
          // Theme is already applied; preference may not survive reload.
        }
      },
    }),
    [preference, resolved],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
