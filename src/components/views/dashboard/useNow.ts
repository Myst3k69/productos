"use client";

import { useEffect, useState } from "react";

/** Horloge partagée : re-rend toutes les `intervalMs` pour garder durées et « il y a … » à jour. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
