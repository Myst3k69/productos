"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { ChevronRight } from "lucide-react";
import type { EnvId, Release } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { ENVS, ENV_META } from "./release-meta";
import { ReleaseCard, type ReleaseActions } from "./ReleaseCard";

/** Grand pipeline horizontal : Développement → Revue humaine → Préproduction → Production. */
export function PipelineBoard({ byEnv, projectName, actions }: { byEnv: Record<EnvId, Release[]>; projectName: string; actions: ReleaseActions }) {
  return (
    <LayoutGroup>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Environnements">
        {ENVS.map((env, i) => (
          <EnvColumn key={env} env={env} index={i} releases={byEnv[env]} projectName={projectName} actions={actions} last={i === ENVS.length - 1} />
        ))}
      </ol>
    </LayoutGroup>
  );
}

function EnvColumn({ env, index, releases, projectName, actions, last }: { env: EnvId; index: number; releases: Release[]; projectName: string; actions: ReleaseActions; last: boolean }) {
  const meta = ENV_META[env];
  const Icon = meta.icon;
  const prod = env === "production";
  const needsYou = env === "review" && releases.length > 0;
  const working = releases.some((r) => r.status === "running" && r.env !== "production");

  return (
    <li className="reveal flex min-w-0 flex-col" style={{ "--i": index + 2 } as React.CSSProperties} aria-label={meta.label}>
      {/* En-tête : pastille ronde + connecteur */}
      <div className="relative flex items-center gap-3 xl:flex-col xl:gap-2 xl:text-center">
        <span
          className={cn(
            "relative z-[1] inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
            prod ? "border-accent bg-accent text-white shadow-[0_10px_24px_-10px_var(--accent-glow)]" : needsYou ? "pulse-ring border-accent bg-card text-accent-ink before:pointer-events-none" : "border-ink/70 bg-card text-ink",
          )}
          aria-hidden
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
          {releases.length ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-paper px-1 font-mono text-[10.5px] font-bold",
                prod ? "bg-ink text-paper" : needsYou ? "bg-accent text-white" : working ? "bg-ai text-white" : "bg-ink text-paper",
              )}
            >
              {releases.length}
            </span>
          ) : null}
        </span>
        {!last ? (
          <span className="pointer-events-none absolute left-[calc(50%+36px)] top-7 hidden h-px w-[calc(100%-72px+16px)] items-center xl:flex" aria-hidden>
            <span className={cn("h-px flex-1", working && env === "dev" ? "ai-stitch h-[2px]" : "bg-ink/30")} />
            <ChevronRight className="-ml-1.5 h-3.5 w-3.5 text-ink/40" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className={cn("font-display text-[15px] font-extrabold tracking-[-0.02em]", prod ? "text-accent-ink" : "text-ink")}>{meta.label}</h3>
          <p className="text-[12px] text-ink-3">{meta.sub}</p>
        </div>
      </div>

      {/* Releases présentes */}
      <div className={cn("mt-3 flex min-h-[140px] flex-1 flex-col gap-2.5 rounded-xl border p-2", prod ? "border-accent/20 bg-accent-soft/40" : needsYou ? "border-accent/20 bg-paper-2" : "border-line bg-paper-2")}>
        <AnimatePresence initial={false}>
          {releases.map((r) => (
            <ReleaseCard key={r.id} release={r} projectName={projectName} actions={actions} />
          ))}
        </AnimatePresence>
        {!releases.length ? <p className="flex flex-1 items-center justify-center px-3 py-6 text-center text-[12.5px] text-ink-3">{meta.empty}</p> : null}
      </div>
    </li>
  );
}
