"use client";

import { useEffect } from "react";

/** Un seul observateur pour toute la page : ajoute `data-in` aux éléments `[data-reveal]` visibles. */
export function RevealObserver() {
  // défilement doux vers les ancres, uniquement sur la landing
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = prev;
    };
  }, []);

  useEffect(() => {
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])"));
    if (typeof IntersectionObserver === "undefined") {
      pending().forEach((el) => el.setAttribute("data-in", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const watch = () => pending().forEach((el) => io.observe(el));
    watch();
    // éléments ajoutés après coup (rendu client, rechargement à chaud)
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(watch);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
