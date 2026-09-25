"use client";

import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/shell/Brand";
import { Section } from "./Section";

const LINKS = [
  { href: "https://www.buildclub.tech", label: "Build Club", hint: "Ateliers, labs, experts, communauté" },
  { href: "https://startupweek.tech", label: "StartupWeek", hint: "7 jours pour lancer votre MVP" },
];

export function AboutSection({ index }: { index: number }) {
  return (
    <Section index={index} title="À propos" id="a-propos">
      <div className="card-surface rounded-xl p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <BrandMark size={44} />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2 font-display text-[20px] font-extrabold tracking-[-0.04em] text-ink">
                BuildOS
                <span className="font-mono text-[11px] font-medium tracking-normal text-ink-3">prototype · v0.2</span>
              </p>
              <p className="mt-0.5 text-[13px] text-ink-3">Le système d&apos;exploitation des entrepreneurs pour créer et faire évoluer des applications avec l&apos;IA.</p>
            </div>
          </div>
          <p className="shrink-0 whitespace-nowrap font-display text-[22px] font-black leading-[0.95] tracking-[-0.04em] text-ink sm:text-right">
            De l&apos;idée <span className="marker-underline">au réel.</span>
          </p>
        </div>
        <ul className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-3 rounded-md border border-line bg-paper/60 px-3 py-2.5 transition-colors hover:border-line-3"
              >
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink">{l.label}</span>
                  <span className="block truncate text-[12px] text-ink-3">{l.hint}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
