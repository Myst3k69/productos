"use client";

import * as React from "react";
import { Gauge, Hand, PiggyBank, Plane, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { AUTONOMY_META, type Autonomy } from "@/lib/domain/types";
import type { AgentId, CodingAgent, RoutingStrategy } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { Switch } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { cn, initials } from "@/lib/client/utils";
import { OptionCard } from "./OptionCard";
import { StepHeading } from "./StepHeading";
import { vocab, type StepProps } from "./draft";

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;

const STRATEGIES: { value: RoutingStrategy; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "quality", label: "Qualité", hint: "Le meilleur agent pour chaque tâche, même s'il coûte plus cher.", icon: <Gauge /> },
  { value: "balanced", label: "Équilibré", hint: "Le bon compromis entre qualité, vitesse et coût.", icon: <Scale /> },
  { value: "economy", label: "Économie", hint: "L'agent le moins cher capable de faire le travail.", icon: <PiggyBank /> },
];

const AUTONOMY_ICON: Record<Autonomy, React.ReactNode> = { autopilot: <Plane />, plan_gate: <ShieldCheck />, manual: <Hand /> };

const AUTONOMY_SIMPLE: Record<Autonomy, string> = {
  autopilot: "L'IA fait tout le travail d'une traite. Vous relisez le résultat avant qu'il soit mis en ligne.",
  plan_gate: "L'IA vous montre d'abord comment elle compte s'y prendre. Vous dites « go », elle fabrique.",
  manual: "Rien ne bouge tant que vous n'avez pas cliqué sur « Lancer ». Idéal pour garder la main sur tout.",
};

function statusOf(a: CodingAgent): { label: string; tone: string } {
  if (!a.connected) return { label: "À connecter", tone: "bg-ink-4" };
  if (a.status === "quota") return { label: "Quota atteint", tone: "bg-warn" };
  if (a.status === "busy") return { label: "Occupé", tone: "bg-ai" };
  if (a.status === "offline") return { label: "Hors ligne", tone: "bg-ink-4" };
  return { label: "Disponible", tone: "bg-ok" };
}

export function StepAgents({ draft, update, simple, index }: StepProps) {
  const agents = useBuildOS((s) => s.agents);
  const strategy = useBuildOS((s) => s.strategy);
  const toggleAgent = useBuildOS((s) => s.toggleAgent);
  const setStrategy = useBuildOS((s) => s.setStrategy);
  const words = vocab(simple);
  const active = agents.filter((a) => a.enabled && a.connected);

  return (
    <div className="flex flex-col gap-9">
      <StepHeading
        index={index}
        eyebrow="Votre équipe"
        title={
          <>
            Le bon agent, au bon <span className="marker-underline">moment</span>.
          </>
        }
        lead={
          simple
            ? "Des assistants IA spécialisés écrivent le code, les textes et les maquettes à votre place. BuildOS confie chaque tâche au plus adapté ; vous gardez le dernier mot."
            : "BuildOS se connecte à vos agents de code et route chaque tâche selon son type, sa priorité et vos quotas. Activez ceux que vous voulez voir travailler."
        }
      />

      <section aria-labelledby="onb-agents" className="reveal flex flex-col gap-3" style={rv(3)}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="onb-agents" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            Vos {words.agents}
          </h2>
          <span className="num font-mono text-[11.5px] text-ink-3">{active.length} actifs</span>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {agents.map((a, i) => {
            const st = statusOf(a);
            const usable = a.connected && a.status !== "quota";
            return (
              <li
                key={a.id}
                className={cn("reveal flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors", a.enabled && usable ? "border-line-3" : "border-line-2")}
                style={rv(4 + i)}
              >
                <AgentBadge id={a.id} name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[14px] font-bold leading-tight tracking-[-0.02em]" title={a.name}>
                    {a.name}
                  </p>
                  <p className="truncate text-[12px] text-ink-3" title={a.tagline}>
                    {a.tagline}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
                    <span className={cn("h-1.5 w-1.5 rounded-full", st.tone)} aria-hidden />
                    {st.label}
                  </p>
                </div>
                <Switch checked={a.enabled && usable} disabled={!usable} onCheckedChange={(v) => toggleAgent(a.id, v)} label={`${a.enabled ? "Désactiver" : "Activer"} ${a.name}`} />
              </li>
            );
          })}
        </ul>
        <p className="text-[12px] text-ink-3">Vous pourrez connecter d&apos;autres agents et régler le routage plus tard, dans « Mes agents ».</p>
      </section>

      <section aria-labelledby="onb-strategy" className="reveal flex flex-col gap-3" style={rv(6)}>
        <h2 id="onb-strategy" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          Stratégie de routage
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STRATEGIES.map((s) => (
            <OptionCard key={s.value} size="sm" selected={strategy === s.value} onSelect={() => setStrategy(s.value)} label={s.label} hint={s.hint} icon={s.icon} />
          ))}
        </div>
      </section>

      <section aria-labelledby="onb-autonomy" className="reveal flex flex-col gap-3" style={rv(7)}>
        <h2 id="onb-autonomy" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          Jusqu&apos;où l&apos;IA avance seule ?
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(AUTONOMY_META) as Autonomy[]).map((a) => (
            <OptionCard
              key={a}
              selected={draft.autonomy === a}
              onSelect={() => update({ autonomy: a })}
              label={AUTONOMY_META[a].label}
              hint={simple ? AUTONOMY_SIMPLE[a] : AUTONOMY_META[a].hint}
              icon={AUTONOMY_ICON[a]}
              badge={
                a === "plan_gate" ? (
                  <Chip tone="lime" size="xs" icon={<Sparkles />}>
                    Recommandé
                  </Chip>
                ) : null
              }
            />
          ))}
        </div>
        <p className="text-[12px] text-ink-3">Quel que soit votre choix, rien n&apos;est mis en ligne sans votre validation.</p>
      </section>
    </div>
  );
}

function AgentBadge({ id, name }: { id: AgentId; name: string }) {
  const bos = id === "buildos";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] font-display text-[13px] font-black tracking-[-0.04em]",
        bos ? "bg-ai text-white" : "bg-ink text-paper",
      )}
    >
      {bos ? "B/" : initials(name)}
    </span>
  );
}
