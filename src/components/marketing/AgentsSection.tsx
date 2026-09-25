"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Route } from "lucide-react";
import { DEFAULT_AGENTS } from "@/lib/buildos/fixtures";
import type { AgentId } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { AgentGlyph } from "./AgentGlyph";
import { SectionHead } from "./SectionHead";
import { cta, ctaArrow } from "./cta";
import { RV, d } from "./reveal";

type ShownId = Exclude<AgentId, "buildos">;
const ORDER: ShownId[] = ["codex", "claude-code", "cursor", "copilot", "devin"];

const TASKS: { title: string; kind: string; prefs: ShownId[] }[] = [
  { title: "API de paiement", kind: "Code · critique", prefs: ["claude-code", "codex", "copilot"] },
  { title: "Retouche du menu mobile", kind: "Interface", prefs: ["cursor", "codex", "copilot"] },
  { title: "Tests du panier", kind: "Qualité", prefs: ["copilot", "codex", "claude-code"] },
  { title: "Migration de la base", kind: "Infra · longue", prefs: ["devin", "claude-code", "codex"] },
];

interface AgentState {
  enabled: boolean;
  status: "available" | "quota" | "offline";
}

function Toggle({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full border transition-colors duration-200",
        on ? "border-ok bg-ok" : "border-line-3 bg-paper-3",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className={cn("inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ease-spring", on ? "translate-x-[20px]" : "translate-x-[2px]")} />
    </button>
  );
}

export function AgentsSection() {
  const [agents, setAgents] = useState<Record<ShownId, AgentState>>(() => {
    const init = {} as Record<ShownId, AgentState>;
    for (const id of ORDER) {
      const a = DEFAULT_AGENTS.find((x) => x.id === id);
      init[id] = { enabled: !!a?.enabled, status: a?.status === "quota" ? "quota" : a?.status === "offline" ? "offline" : "available" };
    }
    return init;
  });
  const [hint, setHint] = useState<string | null>(null);

  const meta = (id: ShownId) => DEFAULT_AGENTS.find((a) => a.id === id);

  const toggle = (id: ShownId) => {
    const s = agents[id];
    if (s.status === "quota") {
      setHint(`${meta(id)?.name} a atteint son quota : BuildOS reroute ses tâches automatiquement.`);
      return;
    }
    if (s.status === "offline") {
      setHint(`Connectez d'abord ${meta(id)?.name} pour l'ajouter au routage.`);
      return;
    }
    setHint(null);
    setAgents((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));
  };

  const connect = (id: ShownId) => {
    setHint(`${meta(id)?.name} est connecté. Les longues tâches lui sont désormais confiées.`);
    setAgents((prev) => ({ ...prev, [id]: { enabled: true, status: "available" } }));
  };

  const routeOf = (prefs: ShownId[]) => prefs.find((p) => agents[p].enabled && agents[p].status === "available") ?? null;

  return (
    <section aria-labelledby="agents-title" className="mx-auto max-w-[1320px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
      <div className="grid gap-10 rounded-2xl border border-line bg-card p-6 shadow-card sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="relative flex flex-col">
          <SectionHead
            id="agents-title"
            n="02"
            label="Agents de code connectés"
            title={
              <>
                Le bon agent,
                <br />
                au bon moment.
              </>
            }
            lead="BuildOS se connecte à vos agents de code (Codex, Claude Code, Cursor, GitHub Copilot, Devin…) et route intelligemment chaque tâche selon sa nature, la disponibilité et vos quotas. Vous ne choisissez plus : vous validez."
          />
          <div data-reveal style={d(3)} className={`${RV} mt-8 flex flex-wrap items-center gap-6`}>
            <Link href="/agents" className={cta("ink", "md")}>
              Gérer mes agents
              <ArrowRight className={ctaArrow} aria-hidden />
            </Link>
          </div>
          <div data-reveal style={d(4)} className={`${RV} mt-10 lg:mt-auto`}>
            <p
              className="sticky-lime inline-block rounded-[3px] px-4 py-3 text-[18px] uppercase leading-[1.15]"
              style={{ transform: "rotate(-6deg)" }}
            >
              Routage intelligent
              <br />= plus d&apos;impact
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line-2">
            {ORDER.map((id, i) => {
              const a = meta(id);
              const s = agents[id];
              return (
                <li key={id} data-reveal style={d(i)} className={`${RV} flex items-center gap-3 bg-card px-4 py-3.5 transition-colors hover:bg-card-2`}>
                  <AgentGlyph id={id} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{a?.name}</p>
                    <p className="truncate text-[12px] text-ink-3">{a?.tagline}</p>
                  </div>
                  <span
                    className={cn(
                      "hidden items-center gap-1.5 text-[12px] font-medium sm:inline-flex",
                      s.status === "available" ? (s.enabled ? "text-ok" : "text-ink-3") : s.status === "quota" ? "text-accent-ink" : "text-ink-3",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        s.status === "available" ? (s.enabled ? "bg-ok" : "bg-ink-4") : s.status === "quota" ? "bg-accent" : "bg-ink-4",
                      )}
                    />
                    {s.status === "available" ? (s.enabled ? "Disponible" : "En pause") : s.status === "quota" ? "Quota atteint" : "Non connecté"}
                  </span>
                  {s.status === "offline" ? (
                    <button
                      type="button"
                      onClick={() => connect(id)}
                      className="inline-flex h-8 items-center rounded-md border border-line-3 px-2.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink"
                    >
                      Connecter
                    </button>
                  ) : (
                    <Toggle on={s.enabled && s.status === "available"} disabled={s.status !== "available"} onClick={() => toggle(id)} label={`Activer ${a?.name}`} />
                  )}
                </li>
              );
            })}
            <li className="flex items-center gap-3 bg-card-2 px-4 py-3 text-[13px] font-medium text-ink-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] border border-dashed border-line-3">
                <Plus className="h-4 w-4" aria-hidden />
              </span>
              Connecter un autre agent
            </li>
          </ul>

          <p aria-live="polite" className={cn("mt-3 min-h-[20px] text-[12.5px] text-ink-2 transition-opacity", hint ? "opacity-100" : "opacity-0")}>
            {hint}
          </p>

          <div data-reveal style={d(2)} className={`${RV} mt-3 rounded-xl bg-ink p-4 text-paper sm:p-5`}>
            <p className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-paper/60">
              <Route className="h-3.5 w-3.5 text-lime" aria-hidden />
              Routage en direct — essayez les interrupteurs
            </p>
            <ul className="mt-3 space-y-2">
              {TASKS.map((t) => {
                const r = routeOf(t.prefs);
                const ra = r ? meta(r) : null;
                return (
                  <li key={t.title} className="flex items-center gap-3 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">
                      {t.title} <span className="text-paper/45">· {t.kind}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-paper/40" aria-hidden />
                    <span
                      key={r ?? "none"}
                      className={cn(
                        "reveal-fast inline-flex min-w-[118px] items-center justify-end gap-1.5 font-semibold",
                        r ? "text-lime" : "text-accent",
                      )}
                    >
                      {ra ? ra.name : "Aucun agent actif"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
