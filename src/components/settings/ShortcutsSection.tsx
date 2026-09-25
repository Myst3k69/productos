"use client";

import { useEffect, useState } from "react";
import { modKey } from "@/lib/client/utils";
import { Kbd } from "@/components/ui/misc";
import { Section, SettingsCard } from "./Section";

export function ShortcutsSection({ index }: { index: number }) {
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    setMod(modKey());
  }, []);

  const shortcuts: { keys: string[]; label: string; hint: string }[] = [
    { keys: ["N"], label: "Nouvelle tâche", hint: "Ouvre le composeur ; l'IA prend la main dès l'envoi." },
    { keys: [mod, "K"], label: "Palette de commandes", hint: "Rechercher une tâche, changer de vue, agir sans quitter le clavier." },
    { keys: ["0", "5"], label: "Changer d'écran", hint: "Vue d'ensemble, Tableau, Flux, Liste, Semaine, Analytics — dans cet ordre." },
    { keys: ["G", "…"], label: "Aller à", hint: "G puis A agents, F fondations, M mise en prod, U audits, C Build Club, S réglages." },
    { keys: ["."], label: "Assistant IA", hint: "Ouvre ou ferme le panneau de l'assistant." },
    { keys: ["Échap"], label: "Fermer", hint: "Referme le panneau de détail ou la fenêtre ouverte." },
  ];

  return (
    <Section index={index} title="Raccourcis clavier" id="raccourcis">
      <SettingsCard>
        <ul className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-line [&>li:nth-child(n+3)]:sm:border-t [&>li:nth-child(n+3)]:sm:border-line [&>li+li]:max-sm:border-t [&>li+li]:max-sm:border-line">
          {shortcuts.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{s.label}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3 text-pretty">{s.hint}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-ink-4">
                {s.keys.map((k, i) => (
                  <span key={`${k}-${i}`} className="inline-flex items-center gap-1">
                    {i > 0 ? <span aria-hidden>{s.label === "Changer de vue" ? "–" : "+"}</span> : null}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </Section>
  );
}
