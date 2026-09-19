"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "atelier.theme";
/* Événement local : chaque `useTheme()` (barre du haut, palette…) se resynchronise quand l'un d'eux change le thème. */
const EVENT = "atelier:theme";

function readStored(): Theme {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

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
    const sync = () => {
      const stored = readStored();
      setThemeState(stored);
      setResolved(resolve(stored));
    };
    sync();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStored() === "system") {
        applyTheme("system");
        setResolved(resolve("system"));
      }
    };
    mq.addEventListener("change", onChange);
    window.addEventListener(EVENT, sync);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener(EVENT, sync);
    };
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
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => setTheme(resolved === "dark" ? "light" : "dark"), [resolved, setTheme]);

  return { theme, resolved, setTheme, toggle };
}
