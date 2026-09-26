"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Wordmark } from "@/components/shell/Brand";
import { cn } from "@/lib/client/utils";
import { cta, ctaArrow } from "./cta";

const LINKS = [
  { href: "#produit", label: "Produit" },
  { href: "#cas-usage", label: "Cas d'usage" },
  { href: "#build-club", label: "Build Club" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        scrolled || open ? "border-b border-line-2 bg-paper/95 backdrop-blur-md" : "border-b border-transparent bg-paper/0",
      )}
    >
      <nav aria-label="Navigation principale" className="mx-auto flex h-[68px] max-w-[1320px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="BuildOS — accueil" className="shrink-0 rounded-md">
          <Wordmark />
        </Link>

        <ul className="ml-6 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative rounded-md px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-[2px] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:text-ink hover:after:scale-x-100"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className={cta("secondary", "sm", "hidden sm:inline-flex")}>
            Se connecter
          </Link>
          <Link href="/onboarding" className={cta("ink", "sm", "hidden sm:inline-flex")}>
            Démarrer gratuitement
            <ArrowRight className={ctaArrow} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-2 bg-card text-ink lg:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-line bg-paper px-4 pb-6 pt-2 sm:px-6 lg:hidden"
      >
        <ul className="flex flex-col">
          {LINKS.map((l, i) => (
            <li key={l.href} className="reveal-fast" style={{ animationDelay: `${i * 40}ms` }}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-line py-4 font-display text-[26px] font-extrabold tracking-[-0.04em] text-ink"
              >
                {l.label}
                <ArrowRight className="h-5 w-5 text-ink-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/login" className={cta("secondary", "md")}>
            Se connecter
          </Link>
          <Link href="/onboarding" className={cta("ink", "md")}>
            Démarrer
            <ArrowRight className={ctaArrow} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
