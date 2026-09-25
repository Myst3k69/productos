"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";
import { DELIVERABLE_KINDS } from "@/lib/buildos/generate";
import { AUTONOMY_META } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Kbd, WorkingDots } from "@/components/ui/misc";
import { cn, plural } from "@/lib/client/utils";
import type { StepProps } from "./draft";

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;
const CONFETTI_TONES = ["bg-accent", "bg-lime", "bg-ai", "bg-ink"];

/** Confettis sobres : une trentaine de rubans qui tombent une seule fois. */
function Confetti() {
  const reduce = useReducedMotion();
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        delay: (i % 9) * 0.06,
        rotate: ((i * 53) % 360) - 180,
        drift: ((i * 29) % 80) - 40,
        w: i % 3 === 0 ? 10 : 6,
        h: i % 3 === 0 ? 4 : 12,
        tone: CONFETTI_TONES[i % CONFETTI_TONES.length],
      })),
    [],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={cn("absolute top-0 rounded-[1px]", p.tone)}
          style={{ left: `${p.left}%`, width: p.w, height: p.h }}
          initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", x: p.drift, rotate: p.rotate * 3, opacity: [1, 1, 0] }}
          transition={{ duration: 2.6 + (p.id % 5) * 0.25, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

export function StepFinal({ draft, index, onEnter, entering }: StepProps & { onEnter: () => void; entering: boolean }) {
  const project = useStore((s) => s.projects.find((p) => p.id === draft.projectId) ?? null);
  const taskCount = useStore((s) => Object.values(s.tasks).filter((t) => t.projectId === draft.projectId).length);
  const aiBusy = useStore((s) => Object.values(s.tasks).filter((t) => t.projectId === draft.projectId && (t.status === "running" || t.status === "queued")).length);
  const waiting = useStore((s) => Object.values(s.tasks).filter((t) => t.projectId === draft.projectId && (t.status === "waiting_review" || t.status === "waiting_input")).length);
  const agentCount =useBuildOS((s) => s.agents.filter((a) => a.enabled && a.connected).length);
  const reduce = useReducedMotion();
  const name = project?.name ?? draft.brief?.projectName ?? "Votre projet";
  const firstName = draft.name.trim().split(/\s+/)[0];

  const stats = [
    { value: DELIVERABLE_KINDS.length, label: "livrables rédigés" },
    { value: taskCount, label: plural(taskCount, "tâche prête", "tâches prêtes") },
    { value: agentCount, label: plural(agentCount, "agent actif", "agents actifs") },
  ];

  return (
    <div className="relative flex flex-col gap-8">
      <Confetti />

      <div className="relative flex flex-col gap-5">
        <motion.div
          initial={reduce ? false : { scale: 2.4, rotate: -24, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
          className="self-start rounded-md border-[3px] border-accent px-4 py-1 font-display text-[40px] font-black leading-none tracking-[-0.02em] text-accent"
          aria-hidden
        >
          PRÊT
        </motion.div>

        <p className="reveal flex items-center gap-2.5" style={rv(1)}>
          <span className="section-badge">{String(index).padStart(2, "0")}</span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">C&apos;est parti{firstName ? `, ${firstName}` : ""}</span>
        </p>
        <h1 tabIndex={-1} className="reveal font-display text-[42px] font-black leading-[0.92] tracking-[-0.05em] text-ink text-balance outline-none sm:text-[64px]" style={{ ...rv(2), outline: "none" }}>
          {project?.emoji ? <span className="mr-2 align-[0.05em] text-[0.8em]">{project.emoji}</span> : null}
          {name} est sur les <span className="marker-underline">rails</span>.
        </h1>
        <p className="reveal max-w-[520px] text-[15px] leading-relaxed text-ink-2" style={rv(3)}>
          Votre projet est structuré, vos fondations sont rédigées et votre équipe d&apos;agents est prête. Il ne reste qu&apos;à valider ce que l&apos;IA vous proposera.
        </p>
      </div>

      <dl className="reveal grid grid-cols-3 overflow-hidden rounded-xl border-[1.5px] border-ink bg-card shadow-brutal" style={rv(4)}>
        {stats.map((s, i) => (
          <div key={s.label} className={cn("flex flex-col gap-1 px-4 py-4 sm:px-5", i > 0 && "border-l border-line-2")}>
            <dt className="order-2 text-[12px] leading-snug text-ink-3">{s.label}</dt>
            <dd className="num order-1 font-display text-[36px] font-black leading-none tracking-[-0.05em] sm:text-[44px]">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="reveal flex flex-col gap-2" style={rv(5)}>
        {aiBusy > 0 ? (
          <p className="flex items-center gap-2.5 text-[13.5px] text-ai-ink">
            <WorkingDots />
            L&apos;IA est déjà au travail sur {aiBusy} {plural(aiBusy, "tâche")}.
          </p>
        ) : waiting > 0 ? (
          <p className="flex items-center gap-2.5 text-[13.5px] text-accent-ink">
            <span className="pulse-ring inline-flex h-2 w-2 rounded-full bg-accent" aria-hidden />
            L&apos;IA a déjà avancé : {waiting} {plural(waiting, "proposition attend", "propositions attendent")} votre validation.
          </p>
        ) : null}
        {project ? (
          <p className="text-[12.5px] text-ink-3">
            Autonomie : <strong className="font-semibold text-ink-2">{AUTONOMY_META[project.autonomy].label}</strong> · Espace : <span className="font-mono text-[12px]">{project.workspacePath}</span>
          </p>
        ) : null}
      </div>

      <div className="reveal flex flex-wrap items-center gap-3" style={rv(6)}>
        <Button variant="ink" size="lg" onClick={onEnter} loading={entering} autoFocus className="h-[52px] px-6 text-[15.5px] font-semibold">
          Entrer dans mon espace <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <span className="hidden items-center gap-1.5 text-[12px] text-ink-3 sm:flex">
          ou <Kbd>Entrée</Kbd>
        </span>
      </div>
    </div>
  );
}
