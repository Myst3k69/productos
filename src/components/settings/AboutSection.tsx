"use client";

import { BrandMark } from "@/components/shell/Brand";
import { Section } from "./Section";

export function AboutSection({ index }: { index: number }) {
  return (
    <Section index={index} title="À propos" id="a-propos">
      <div className="card-surface rounded-xl p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <BrandMark size={40} />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2 font-display text-[17px] font-bold tracking-[-0.02em] text-ink">
                Atelier
                <span className="font-mono text-[11px] font-medium tracking-normal text-ink-3">prototype · v0.1</span>
              </p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                Conçu pour{" "}
                <a href="https://startupweek.tech" target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-2 transition-colors hover:text-accent">
                  startupweek.tech
                </a>
                , le bootcamp MVP de 7 jours.
              </p>
            </div>
          </div>
          <p className="font-display text-[15px] leading-snug text-ink-2 sm:max-w-[240px] sm:text-right">
            « Vous décrivez. <span className="text-ai-ink">L'IA fabrique.</span> <span className="text-accent-ink">Vous validez.</span> »
          </p>
        </div>
      </div>
    </Section>
  );
}
