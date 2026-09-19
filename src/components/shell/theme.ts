"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "atelier.theme";

function resolve(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const dark = resolve(theme) === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    let stored: Theme = "system";
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === "light" || v === "dark") stored = v;
    } catch {
      /* ignore */
    }
    setThemeState(stored);
    setResolved(resolve(stored));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (stored === "system") {
        applyTheme("system");
        setResolved(resolve("system"));
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setResolved(resolve(t));
    try {
      if (t === "system") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, t);
    } catch {
      /* ignore */
    }
    applyTheme(t);
  }, []);

  const toggle = useCallback(() => setTheme(resolved === "dark" ? "light" : "dark"), [resolved, setTheme]);

  return { theme, resolved, setTheme, toggle };
}
