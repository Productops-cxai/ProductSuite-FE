export type ThemeMode = "light" | "dark" | "system";

export const THEME_KEY = "ps_theme_mode";

export function readThemeMode(): ThemeMode {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "light";
}

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveDark(mode: ThemeMode = readThemeMode()): boolean {
  return mode === "dark" || (mode === "system" && prefersDark());
}

/** Apply light/dark class based on stored preference (or the mode you pass). */
export function applyTheme(mode: ThemeMode = readThemeMode()): void {
  const dark = resolveDark(mode);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = mode;
  localStorage.setItem(THEME_KEY, mode);
}

export function setThemeMode(mode: ThemeMode): void {
  applyTheme(mode);
}

/** Keep System mode in sync when the OS theme changes. */
export function watchSystemTheme(onChange?: (dark: boolean) => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (readThemeMode() === "system") {
      applyTheme("system");
      onChange?.(mq.matches);
    }
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
