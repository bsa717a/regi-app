import {
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  type ThemePreference,
  type ResolvedTheme,
} from "@/lib/theme/types";

/** Inline script applied before paint to avoid theme flash. Keep dependency-free. */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var p=(s==="light"||s==="dark"||s==="system")?s:"system";var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=p==="dark"||(p==="system"&&d);document.documentElement.classList.toggle("dark",t);document.documentElement.dataset.themePreference=p;}catch(e){}})();`;

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/** Read preference applied by the inline init script (before React hydrates). */
export function readInitialThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const fromDom = document.documentElement.dataset.themePreference;
  if (fromDom && isThemePreference(fromDom)) return fromDom;
  return readStoredThemePreference();
}

export function readInitialResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyThemeClass(
  preference: ThemePreference,
  prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches,
): void {
  const resolved = resolveTheme(preference, prefersDark);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.themePreference = preference;
}

export function persistThemePreference(preference: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, preference);
}
