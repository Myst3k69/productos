"use client";

import type { CSSProperties } from "react";
import { Asterisk } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { Avatar } from "./Avatar";

const STATS = [
  { value: "1 200+", label: "membres actifs" },
  { value: "150+", label: "ateliers animés" },
  { value: "90 %", label: "de participation" },
  { value: "4,9/5", label: "de satisfaction" },
];

const FACES = ["SA", "JP", "MD", "AL", "KB", "LM", "IR"];

/** En-tête éditorial du Build Club : grand titre, visuel en trame N&B, post-it lime, chiffres clés. */
export function ClubHero() {
  return (
    <header className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
      <div className="reveal" style={{ "--i": 0 } as CSSProperties}>
        <div className="flex items-center gap-2.5">
          <span className="section-badge">07</span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">Build Club · Communauté</span>
        </div>
        <h1 className="mt-4 text-[46px] font-black leading-[0.92] tracking-[-0.05em] text-ink text-balance sm:text-[64px]">
          Vous ne construisez pas <span className="marker-underline">seul.</span>
        </h1>
        <p className="mt-5 text-[17px] font-semibold tracking-[-0.01em] text-ink">L&apos;IA pour ceux qui construisent demain.</p>
        <p className="mt-1.5 max-w-[520px] text-[15px] leading-relaxed text-ink-2 text-pretty">
          Des ateliers pratiques, des labs entre pairs, des experts à la demande et une communauté de fondateurs qui livrent chaque semaine.
        </p>
        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.label} className="reveal border-l-2 border-ink pl-3" style={{ "--i": i + 2 } as CSSProperties}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block whitespace-nowrap font-display text-[26px] font-black leading-none tracking-[-0.05em] text-ink 2xl:text-[30px]">{s.value}</span>
                <span className="mt-1 block text-[12.5px] text-ink-3">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="reveal relative pb-6 pr-2 sm:pr-6" style={{ "--i": 2 } as CSSProperties} aria-hidden>
        <div className="relative h-[260px] overflow-hidden rounded-2xl bg-ink sm:h-[320px]">
          {/* Trame demi-teinte : deux grilles de points, masquées pour évoquer une photo imprimée. */}
          <div
            className="halftone absolute inset-0 text-paper/80"
            style={{ maskImage: "radial-gradient(circle at 72% 38%, #000 0%, rgba(0,0,0,.55) 30%, transparent 62%)", WebkitMaskImage: "radial-gradient(circle at 72% 38%, #000 0%, rgba(0,0,0,.55) 30%, transparent 62%)" }}
          />
          <div
            className="halftone absolute inset-0 text-paper/40"
            style={{ backgroundSize: "11px 11px", maskImage: "linear-gradient(200deg, transparent 35%, #000 100%)", WebkitMaskImage: "linear-gradient(200deg, transparent 35%, #000 100%)" }}
          />
          <p className="absolute left-5 top-5 font-display text-[64px] font-black uppercase leading-[0.82] tracking-[-0.06em] text-paper sm:text-[84px]">
            Build
            <br />
            Club
          </p>
          <Asterisk className="absolute right-5 top-4 h-14 w-14 text-accent" strokeWidth={3} />
          <div className="absolute bottom-5 left-5 flex items-center">
            {FACES.map((f, i) => (
              <Avatar key={f} initials={f} size={34} className={cn(i ? "-ml-2.5 ring-2 ring-ink" : "ring-2 ring-ink", i >= 4 && "hidden sm:inline-flex")} />
            ))}
            <span className="-ml-2.5 inline-flex h-[34px] items-center rounded-full bg-paper px-3 font-mono text-[12px] font-bold text-ink ring-2 ring-ink">+1 200</span>
          </div>
          <p className="absolute bottom-6 right-5 hidden font-hand text-[15px] uppercase leading-tight text-paper/90 [transform:rotate(-4deg)] sm:block">
            Lyon · Paris
            <br />
            et en ligne
          </p>
        </div>
        <div
          className="sticky-lime animate-float absolute -bottom-1 right-0 w-[176px] rounded-sm px-4 py-3 text-[17px] uppercase leading-[1.12] sm:right-2 sm:w-[196px] sm:text-[19px]"
          style={{ "--r": "-6deg", transform: "rotate(-6deg)" } as CSSProperties}
        >
          Apprendre ·
          <br />
          Tester ·
          <br />
          Partager ·
          <br />
          Construire
        </div>
      </div>
    </header>
  );
}
