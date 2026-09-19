"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Moon, Plus, Sparkles, Sun } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Wordmark } from "@/components/shell/Brand";
import { useTheme } from "@/components/shell/theme";
import { ProjectDialog } from "@/components/project/ProjectDialog";
import { StageFrieze } from "./StageFrieze";

function rv(i: number): React.CSSProperties {
  return { "--i": i } as React.CSSProperties;
}

/** Accueil : affiché quand il n'y a aucun projet. Page autonome, sans barre latérale. */
export function Welcome() {
  const seedDemo = useStore((s) => s.seedDemo);
  const openProjectDialog = useStore((s) => s.openProjectDialog);
  const { resolved, toggle } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const explore = async () => {
    setLoading(true);
    try {
      await seedDemo();
      toast.success("Démo chargée", { description: "Deux projets, une vingtaine de tâches : l'IA simulée reprend son travail." });
      router.replace("/board");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chargement impossible.");
      setLoading(false);
    }
  };

  return (
    <div className="relative h-dvh overflow-x-hidden overflow-y-auto scrollbar-thin">
      <Backdrop />

      <div className="relative mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-5 py-5 sm:px-10 sm:py-7">
        <header className="reveal flex items-center justify-between" style={rv(0)}>
          <Wordmark />
          <div className="flex items-center gap-2">
            <Chip tone="violet" size="sm">
              Prototype
            </Chip>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={resolved === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}>
              {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-12 sm:py-16">
          <p className="reveal text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3" style={rv(1)}>
            Le tableau de bord des fondateurs qui livrent
          </p>
          <h1 className="reveal mt-4 font-display text-[44px] font-bold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[56px]" style={rv(2)}>
            <span className="block">Vous décrivez.</span>
            <span className="block text-ai-ink">L'IA fabrique.</span>
            <span className="block text-accent-ink">Vous validez.</span>
          </h1>
          <p className="reveal mt-6 max-w-[58ch] text-[16px] leading-relaxed text-ink-2 text-pretty" style={rv(3)}>
            Écrivez ce que vous voulez obtenir — une fonctionnalité, une étude, une page, un email. L'IA cadre, planifie, fabrique et contrôle. Vous gardez le dernier mot, puis tout
            s'intègre dans votre dépôt ou votre dossier de livrables.
          </p>

          <div className="reveal mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center" style={rv(4)}>
            <Button variant="ai" size="lg" loading={loading} onClick={() => void explore()} className="w-full sm:w-auto">
              {!loading ? <Sparkles className="h-4 w-4" /> : null}
              Explorer avec la démo
            </Button>
            <Button variant="primary" size="lg" onClick={() => openProjectDialog(null)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Créer mon projet
            </Button>
            <span className="text-[12.5px] leading-snug text-ink-3 sm:ml-2 sm:max-w-[26ch]">La démo charge deux projets et une vingtaine de tâches, à tous les stades.</span>
          </div>

          <StageFrieze className="mt-16 sm:mt-20" index={5} />
        </main>

        <footer className="reveal flex flex-col gap-2 border-t border-line pt-5 text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between" style={rv(15)}>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Prototype — IA simulée, aucune donnée ne quitte votre navigateur.
          </span>
          <span>
            Conçu pour{" "}
            <a href="https://startupweek.tech" target="_blank" rel="noreferrer" className="text-ink-2 underline underline-offset-2 transition-colors hover:text-accent-ink">
              startupweek.tech
            </a>
          </span>
        </footer>
      </div>

      {/* La coquille ne monte pas le dialogue projet sans projet : l'accueil porte le sien. */}
      <ProjectDialog />
    </div>
  );
}

/** Motif décoratif : la couture diagonale de la marque, en filigrane. */
function Backdrop() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 640"
      fill="none"
      className="pointer-events-none absolute -right-28 -top-32 h-[520px] w-[520px] opacity-60 sm:-right-16 sm:-top-20 sm:h-[640px] sm:w-[640px] sm:opacity-100"
    >
      <path d="M40 600 600 40" stroke="var(--line-2)" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 12" />
      <path d="M140 640 640 140" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 12" />
      <path d="M0 520 520 0" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 12" />
      <circle cx="520" cy="520" r="26" fill="var(--accent)" fillOpacity="0.14" />
      <circle cx="520" cy="520" r="7" fill="var(--accent)" />
    </svg>
  );
}
