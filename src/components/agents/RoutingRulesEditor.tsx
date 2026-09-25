"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { AgentId, CodingAgent, RoutingRule, RoutingStrategy } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { DEFAULT_ROUTING } from "@/lib/buildos/fixtures";
import { PRIORITIES, PRIORITY_META, TASK_TYPES, TASK_TYPE_META, type Priority, type TaskType } from "@/lib/domain/types";
import { cn, uid } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownCheckItem, DropdownContent, DropdownLabel, DropdownTrigger } from "@/components/ui/dropdown";
import { STRATEGY_META, isUsable, unusableReason } from "./agent-meta";

/** Règles de routage éditables : la première règle qui correspond l'emporte. */
export function RoutingRulesEditor({ rules, agents, strategy }: { rules: RoutingRule[]; agents: CodingAgent[]; strategy: RoutingStrategy }) {
  const set = (next: RoutingRule[]) => useBuildOS.getState().setRouting(next);
  const update = (id: string, patch: Partial<RoutingRule>) => set(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const remove = (rule: RoutingRule) => {
    const before = rules;
    set(rules.filter((r) => r.id !== rule.id));
    toast("Règle supprimée", {
      description: rule.label,
      action: { label: "Annuler", onClick: () => set(before) },
    });
  };
  const add = () => {
    const agent = agents.find(isUsable) ?? agents[0];
    set([
      ...rules,
      {
        id: uid("r"),
        label: "Nouvelle règle",
        when: { types: ["code"] },
        agentId: agent.id,
      },
    ]);
  };
  const connected = agents.filter((a) => a.connected);

  return (
    <div>
      <ol className="flex flex-col gap-2" aria-label="Règles de routage, par ordre de priorité">
        {rules.map((r, i) => {
          const agent = agents.find((a) => a.id === r.agentId);
          const ignored = !agent || !isUsable(agent);
          return (
            <li key={r.id} className="reveal-fast rounded-lg border border-line bg-card-2 p-3">
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-ink px-1 font-mono text-[10.5px] font-bold text-paper"
                  aria-label={`Règle ${i + 1}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <input
                    value={r.label}
                    onChange={(e) => update(r.id, { label: e.target.value })}
                    aria-label={`Nom de la règle ${i + 1}`}
                    className="h-8 w-full rounded-md border border-transparent bg-transparent px-1.5 text-[13.5px] font-semibold text-ink transition-colors hover:border-line-2 focus:border-accent focus:bg-card focus:outline-none"
                  />
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1.5 text-[12px] text-ink-3">
                    <span>Quand</span>
                    <MultiPicker
                      label="Types"
                      empty="tout type"
                      options={TASK_TYPES.map((t) => ({
                        value: t,
                        label: TASK_TYPE_META[t].label,
                      }))}
                      value={r.when.types ?? []}
                      onChange={(types) =>
                        update(r.id, {
                          when: { ...r.when, types: types as TaskType[] },
                        })
                      }
                    />
                    <span>et</span>
                    <MultiPicker
                      label="Priorités"
                      empty="toute priorité"
                      options={PRIORITIES.map((p) => ({
                        value: p,
                        label: PRIORITY_META[p].label,
                      }))}
                      value={r.when.priorities ?? []}
                      onChange={(priorities) =>
                        update(r.id, {
                          when: {
                            ...r.when,
                            priorities: priorities as Priority[],
                          },
                        })
                      }
                    />
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowRight className="mx-0.5 h-3.5 w-3.5 text-ink-2" aria-hidden />
                      <div className="w-[150px]">
                        <Select
                          value={r.agentId}
                          onChange={(e) => update(r.id, { agentId: e.target.value as AgentId })}
                          aria-label={`Agent de la règle ${i + 1}`}
                          className="h-7 text-[12.5px] font-medium"
                        >
                          {connected.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                          {agent && !agent.connected ? <option value={agent.id}>{agent.name} (non connecté)</option> : null}
                        </Select>
                      </div>
                    </span>
                  </div>
                  {ignored ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 px-1.5 text-[12px] text-warn">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      Règle ignorée pour l&apos;instant : {unusableReason(agent)}.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Tooltip content="Monter">
                    <Button variant="ghost" size="icon-sm" aria-label={`Monter la règle ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Descendre">
                    <Button variant="ghost" size="icon-sm" aria-label={`Descendre la règle ${i + 1}`} disabled={i === rules.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Supprimer">
                    <Button variant="ghost" size="icon-sm" aria-label={`Supprimer la règle ${i + 1}`} className="hover:text-danger" onClick={() => remove(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </li>
          );
        })}
        <li className="flex items-center gap-2.5 rounded-lg border border-dashed border-line-2 px-3 py-2.5 text-[12.5px] text-ink-3">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-paper-3 px-1 font-mono text-[10.5px] font-bold text-ink-3">∞</span>
          <span className="min-w-0">
            Sinon : l&apos;agent le plus adapté au type de tâche, selon la stratégie <strong className="font-semibold text-ink-2">« {STRATEGY_META[strategy].label} »</strong>.
          </span>
        </li>
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Ajouter une règle
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            set(DEFAULT_ROUTING);
            toast.success("Règles par défaut rétablies");
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Rétablir les règles par défaut
        </Button>
      </div>
    </div>
  );
}

function MultiPicker({
  label,
  empty,
  options,
  value,
  onChange,
}: {
  label: string;
  empty: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const text = value.length ? (value.length <= 2 ? value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ") : `${value.length} ${label.toLowerCase()}`) : empty;
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          aria-label={`${label} : ${text}`}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
            value.length ? "border-ink/20 bg-card text-ink" : "border-dashed border-line-3 text-ink-3 hover:text-ink",
          )}
        >
          {text}
          <ChevronDown className="h-3 w-3 text-ink-3" aria-hidden />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start">
        <DropdownLabel>{label}</DropdownLabel>
        {options.map((o) => (
          <DropdownCheckItem
            key={o.value}
            checked={value.includes(o.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(c) => onChange(c ? [...value, o.value] : value.filter((v) => v !== o.value))}
          >
            {o.label}
          </DropdownCheckItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
