"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  Bot,
  ChartColumn,
  Check,
  Folder,
  LayoutDashboard,
  ListFilter,
  MoreHorizontal,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { AgentId } from "@/lib/buildos/types";
import { BrandMark } from "@/components/shell/Brand";
import { WorkingDots } from "@/components/ui/misc";
import { cn } from "@/lib/client/utils";
import { AgentGlyph } from "./AgentGlyph";

/* ───────── données de la fausse app ───────── */

type Col = 0 | 1 | 2;
interface FakeCard {
  id: string;
  title: string;
  label: string;
  people: string[];
  agent?: { id: AgentId; name: string };
}

const COLS: { title: string; tone: "neutral" | "ai" | "accent" }[] = [
  { title: "À faire", tone: "neutral" },
  { title: "En cours", tone: "ai" },
  { title: "En revue", tone: "accent" },
];

const STATIC: Record<Col, FakeCard[]> = {
  0: [
    { id: "c1", title: "Finaliser le PRD", label: "Spécification", people: ["CL", "MB"] },
    { id: "c2", title: "Modéliser les données", label: "Architecture", people: ["MB"] },
    { id: "c3", title: "Étudier les cas limites", label: "Analyse", people: ["CL", "SR"] },
  ],
  1: [
    { id: "c4", title: "Wireframes UI/UX", label: "Design", people: ["SR"], agent: { id: "buildos", name: "Studio BuildOS" } },
    { id: "c5", title: "Développement API", label: "Code", people: ["MB"], agent: { id: "claude-code", name: "Claude Code" } },
  ],
  2: [
    { id: "c6", title: "Page d'accueil", label: "Code", people: ["CL"], agent: { id: "codex", name: "Codex" } },
    { id: "c7", title: "Dashboard v1", label: "Code", people: ["MB"], agent: { id: "claude-code", name: "Claude Code" } },
  ],
};

const MOVING: FakeCard = { id: "moving", title: "Intégration paiement", label: "Code", people: ["CL"], agent: { id: "codex", name: "Codex" } };

const USER_MSG = "Je veux créer une application de réservation pour des hôtels indépendants, avec paiement en ligne et un espace client.";
const AI_LINES = [
  "Super ! Pour bien cadrer, j'ai quelques questions :",
  "Qui sont vos utilisateurs principaux ?",
  "Quels moyens de paiement souhaitez-vous ?",
  "Voulez-vous une interface d'administration ?",
  "Avez-vous des contraintes techniques ou des outils existants ?",
];

/* ───────── hooks ───────── */

function useInView<T extends Element>(margin = "0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView] as const;
}

/** Position de la carte animée : 0 → 1 → 2 → (validée) → 0… */
function useCycle(active: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 2600);
    return () => clearInterval(t);
  }, [active]);
  return step;
}

/** L'assistant « écrit » ses lignes l'une après l'autre, puis recommence. */
function useTypewriter(active: boolean) {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [thinking, setThinking] = useState(true);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLine(AI_LINES.length);
      setThinking(false);
      return;
    }
    let l = 0;
    let c = 0;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      l = 0;
      c = 0;
      setLine(0);
      setChars(0);
      setThinking(true);
      timer = setTimeout(tick, 900);
    };
    const tick = () => {
      setThinking(false);
      const full = AI_LINES[l];
      c += 2;
      setChars(c);
      if (c >= full.length) {
        l += 1;
        c = 0;
        setLine(l);
        setChars(0);
        if (l >= AI_LINES.length) {
          timer = setTimeout(reset, 5200);
          return;
        }
        setThinking(true);
        timer = setTimeout(tick, 520);
        return;
      }
      timer = setTimeout(tick, 26);
    };
    reset();
    return () => clearTimeout(timer);
  }, [active]);
  return { line, chars, thinking };
}

/* ───────── petits morceaux ───────── */

function Avatars({ people }: { people: string[] }) {
  return (
    <span className="flex -space-x-1.5">
      {people.map((p, i) => (
        <span
          key={p + i}
          className={cn(
            "inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-card font-mono text-[7.5px] font-bold",
            i % 2 ? "bg-paper-3 text-ink" : "bg-ink text-paper",
          )}
        >
          {p}
        </span>
      ))}
    </span>
  );
}

function CardView({ card, state }: { card: FakeCard; state?: "todo" | "running" | "review" | "done" }) {
  const running = state === "running";
  const review = state === "review";
  const done = state === "done";
  return (
    <div
      className={cn(
        "relative rounded-[9px] border bg-card p-2.5 shadow-card",
        state ? (review ? "pulse-ring border-accent/60" : running ? "border-ai/40" : done ? "border-ok/50" : "border-line-2") : "border-line",
        state && "shadow-lift",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[12px] font-semibold text-ink" title={card.title}>
          {card.title}
        </p>
        <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-ink-4" aria-hidden />
      </div>
      <p className={cn("mt-0.5 text-[10.5px]", card.label === "Code" ? "text-ai" : "text-ink-3")}>{card.label}</p>
      {running ? <div className="ai-stitch mt-2 h-[3px] rounded-full opacity-80" /> : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        {card.agent ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] text-ink-2">
            <AgentGlyph id={card.agent.id} size={16} className="rounded-[4px]" />
            <span className="truncate">{card.agent.name}</span>
            {running ? <WorkingDots className="ml-0.5" /> : null}
          </span>
        ) : (
          <Avatars people={card.people} />
        )}
        {review ? (
          <span className="rounded-full bg-accent px-1.5 py-[2px] text-[9.5px] font-bold uppercase tracking-wide text-white">À valider</span>
        ) : done ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-ok-soft px-1.5 py-[2px] text-[9.5px] font-bold uppercase tracking-wide text-ok">
            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden /> Validé
          </span>
        ) : card.agent ? (
          <Avatars people={card.people} />
        ) : null}
      </div>
    </div>
  );
}

const NAV = [
  { icon: LayoutDashboard, label: "Vue d'ensemble" },
  { icon: Folder, label: "Projets", active: true },
  { icon: Bot, label: "Mes agents" },
  { icon: ChartColumn, label: "Analytics" },
  { icon: ShieldCheck, label: "Audits" },
  { icon: Users, label: "Équipe" },
  { icon: Settings, label: "Paramètres" },
];

/* ───────── composant ───────── */

export function ProductPreview() {
  const [ref, inView] = useInView<HTMLDivElement>("-10% 0px");
  const step = useCycle(inView);
  const { line, chars, thinking } = useTypewriter(inView);

  // 0 : À faire · 1 : En cours · 2 : En revue · 3 : validée (reste en revue, badge vert)
  const movingCol: Col = step === 0 ? 0 : step === 1 ? 1 : 2;
  const movingState = step === 0 ? "todo" : step === 1 ? "running" : step === 2 ? "review" : "done";

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl border border-line-2 bg-card shadow-pop"
        role="img"
        aria-label="Aperçu de BuildOS : tableau Kanban du projet « App de réservation — Hôtel Lumière » et assistant IA qui pose des questions de cadrage."
      >
        {/* barre de fenêtre */}
        <div className="flex h-9 items-center gap-3 border-b border-line bg-card-2 px-3.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-line-3" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-3" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-3" />
          </span>
          <span className="mx-auto truncate rounded-md bg-paper-2 px-3 py-0.5 font-mono text-[10.5px] text-ink-3">app.buildos.fr/projets/hotel-lumiere</span>
          <span className="w-10" aria-hidden />
        </div>

        <div className="grid lg:grid-cols-[196px_minmax(0,1fr)] xl:grid-cols-[196px_minmax(0,1fr)_300px]">
          {/* barre latérale */}
          <aside className="hidden flex-col border-r border-line bg-card-2 p-3 lg:flex" aria-hidden>
            <div className="flex items-center gap-2 px-1.5 py-1">
              <BrandMark size={24} />
              <span className="font-display text-[15px] font-extrabold tracking-[-0.04em]">BuildOS</span>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-md border border-line-2 bg-card px-2.5 py-1.5 text-[11.5px] font-medium">
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Nouveau projet
              </span>
            </div>
            <ul className="mt-4 space-y-0.5">
              {NAV.map((n) => (
                <li
                  key={n.label}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-[7px] text-[11.5px]",
                    n.active ? "bg-accent font-semibold text-white" : "text-ink-2",
                  )}
                >
                  <n.icon className="h-3.5 w-3.5" />
                  {n.label}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center gap-2 rounded-md border border-line bg-card p-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-lime font-mono text-[10px] font-bold text-lime-ink">CL</span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[11px] font-semibold">Camille L.</span>
                <span className="block truncate text-[10px] text-ink-3">Fondatrice · Hôtel Lumière</span>
              </span>
            </div>
          </aside>

          {/* tableau */}
          <div className="min-w-0 p-3.5 sm:p-5" aria-hidden>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Projets / Hôtel Lumière</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h3 className="font-display text-[17px] font-extrabold tracking-[-0.03em] sm:text-[19px]">App de réservation — Hôtel Lumière</h3>
              <span className="rounded-full bg-ai-soft px-2 py-[3px] text-[10.5px] font-semibold text-ai-ink">En cours</span>
              <span className="ml-auto hidden items-center gap-2 sm:flex">
                <span className="inline-flex h-7 items-center gap-1 rounded-md border border-line-2 px-2 text-[11px] text-ink-2">
                  <ListFilter className="h-3 w-3" /> Filtre
                </span>
                <span className="inline-flex h-7 items-center gap-1 rounded-md bg-ink px-2.5 text-[11px] font-semibold text-paper">
                  <Plus className="h-3 w-3" /> Nouvelle tâche
                </span>
              </span>
            </div>
            <div className="mt-3 flex gap-4 border-b border-line text-[11.5px] text-ink-3">
              {["Kanban", "Calendrier", "Fichiers", "Analytics", "Paramètres"].map((t, i) => (
                <span key={t} className={cn("-mb-px pb-2", i === 0 ? "border-b-2 border-ink font-semibold text-ink" : "", i > 2 && "hidden sm:inline")}>
                  {t}
                </span>
              ))}
            </div>

            <div className="-mx-3.5 mt-4 overflow-x-auto px-3.5 pb-1 scrollbar-none sm:mx-0 sm:px-0">
              <LayoutGroup>
                <div className="grid min-w-[600px] grid-cols-3 gap-3">
                  {COLS.map((col, ci) => {
                    const cards = STATIC[ci as Col];
                    const count = cards.length + (movingCol === ci ? 1 : 0);
                    return (
                      <div
                        key={col.title}
                        className={cn(
                          "rounded-xl p-2",
                          col.tone === "accent" ? "bg-accent-soft/60" : col.tone === "ai" ? "bg-ai-soft/40" : "bg-paper-2/70",
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between px-1">
                          <span className={cn("text-[11.5px] font-semibold", col.tone === "accent" ? "text-accent-ink" : col.tone === "ai" ? "text-ai-ink" : "text-ink")}>
                            {col.title} <span className="font-mono text-ink-3">{count}</span>
                          </span>
                          <Plus className="h-3 w-3 text-ink-3" />
                        </div>
                        <div className="flex flex-col gap-2">
                          {ci === 2 && movingCol === 2 ? (
                            <motion.div layoutId="bos-moving" transition={{ type: "spring", stiffness: 260, damping: 28 }}>
                              <CardView card={MOVING} state={movingState} />
                            </motion.div>
                          ) : null}
                          {cards.map((c) => (
                            <motion.div key={c.id} layout transition={{ type: "spring", stiffness: 260, damping: 28 }}>
                              <CardView card={c} />
                            </motion.div>
                          ))}
                          {ci !== 2 && movingCol === ci ? (
                            <motion.div layoutId="bos-moving" transition={{ type: "spring", stiffness: 260, damping: 28 }}>
                              <CardView card={MOVING} state={movingState} />
                            </motion.div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </LayoutGroup>
            </div>
          </div>

          {/* assistant IA */}
          <div className="flex min-h-[340px] flex-col border-t border-line bg-card lg:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0" aria-hidden>
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <Sparkles className="h-3.5 w-3.5 text-ai" />
              <span className="text-[12px] font-semibold">Assistant IA</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-ink-3">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Pose des questions
              </span>
              <X className="h-3.5 w-3.5 text-ink-4" />
            </div>
            <div className="flex-1 space-y-3 p-4">
              <div className="ml-6 rounded-xl rounded-tr-sm bg-ai-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-ink">{USER_MSG}</div>
              <div className="flex gap-2">
                <BrandMark size={22} className="mt-0.5" />
                <div className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-ink">
                  {line >= 1 ? <p>{AI_LINES[0]}</p> : line === 0 && !thinking ? <p className="caret">{AI_LINES[0].slice(0, chars)}</p> : null}
                  {line >= 1 ? (
                    <ol className="mt-2 space-y-1.5">
                      {AI_LINES.slice(1).map((q, i) => {
                        const idx = i + 1;
                        if (idx > line) return null;
                        const typing = idx === line;
                        if (typing && thinking) return null;
                        return (
                          <li key={q} className="flex gap-1.5">
                            <span className="font-mono text-[10.5px] text-ai">{idx}.</span>
                            <span className={typing ? "caret" : undefined}>{typing ? q.slice(0, chars) : q}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                  {thinking && line < AI_LINES.length ? <WorkingDots className="mt-2" /> : null}
                </div>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 rounded-lg border border-line-2 bg-card-2 py-1.5 pl-3 pr-1.5">
                <span className="flex-1 truncate text-[11.5px] text-ink-4">Écrire votre réponse…</span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-ink text-paper">
                  <Send className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
