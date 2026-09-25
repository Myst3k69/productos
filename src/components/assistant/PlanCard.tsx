"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCircle2, Pencil, Plus, Sparkles, X } from "lucide-react";
import { TASK_TYPES, TASK_TYPE_META } from "@/lib/domain/types";
import type { TaskType } from "@/lib/domain/types";
import { cn, uid } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { PriorityMark, TypeIcon } from "@/components/shared/task-bits";
import { AgentBadge, useRoutedAgent } from "@/components/shared/AgentBadge";
import type { AssistantPlan, PlanItem } from "./types";

/** Plan proposé par l'assistant : 2 à 4 tâches, chacune avec son agent. */
export function PlanCard({ plan, onCreate, onChange }: { plan: AssistantPlan; onCreate: () => Promise<void>; onChange: (plan: AssistantPlan) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<PlanItem[]>(plan.items);
  const [busy, setBusy] = React.useState(false);
  const created = plan.state === "created";

  const startEdit = () => {
    setDraft(plan.items);
    setEditing(true);
  };
  const saveEdit = () => {
    const items = draft.map((d) => ({ ...d, title: d.title.trim() })).filter((d) => d.title);
    onChange({ ...plan, items });
    setEditing(false);
  };
  const patch = (id: string, p: Partial<PlanItem>) => setDraft((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", created ? "border-ok/30" : "border-line-2 shadow-card")}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-3">Plan proposé</span>
        <span className="font-mono text-[10.5px] text-ink-4">
          {(editing ? draft : plan.items).length} tâche{(editing ? draft : plan.items).length > 1 ? "s" : ""}
        </span>
        <span className="flex-1" />
        {created ? (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ok">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Tâches créées
          </span>
        ) : null}
      </div>

      <ol className="divide-y divide-line">
        {(editing ? draft : plan.items).map((item, i) =>
          editing ? (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2">
              <span className="w-4 shrink-0 font-mono text-[11px] text-ink-4">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <input
                  value={item.title}
                  onChange={(e) => patch(item.id, { title: e.target.value })}
                  aria-label={`Titre de la tâche ${i + 1}`}
                  className="h-7 w-full rounded-sm border border-line-2 bg-card px-2 text-[12.5px] font-medium focus:border-accent focus:outline-none"
                />
                <select
                  value={item.type}
                  onChange={(e) => patch(item.id, { type: e.target.value as TaskType })}
                  aria-label={`Type de la tâche ${i + 1}`}
                  className="mt-1 h-6 rounded-sm border border-line bg-paper px-1 text-[11.5px] text-ink-2 focus:border-accent focus:outline-none"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TASK_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setDraft((list) => list.filter((x) => x.id !== item.id))}
                aria-label={`Retirer « ${item.title} »`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-ink-3 hover:bg-danger-soft hover:text-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ) : (
            <PlanRow key={item.id} item={item} index={i} done={created} />
          ),
        )}
      </ol>

      {editing ? (
        <div className="flex items-center gap-1.5 border-t border-line bg-card-2 px-3 py-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setDraft((list) => [...list, { id: uid("pi"), title: "", type: "code", priority: "medium", spec: `Besoin exprimé : ${plan.need}.` }])}
            disabled={draft.length >= 6}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Ajouter
          </Button>
          <span className="flex-1" />
          <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
            Annuler
          </Button>
          <Button size="xs" variant="ink" onClick={saveEdit} disabled={!draft.some((d) => d.title.trim())}>
            <Check className="h-3 w-3" aria-hidden />
            Enregistrer
          </Button>
        </div>
      ) : created ? (
        <div className="flex items-center justify-between gap-2 border-t border-line bg-ok-soft/40 px-3 py-2 text-[12px] text-ink-2">
          <span>L&apos;IA a pris la main.</span>
          <Link href="/board" className="font-medium text-ink underline underline-offset-2 hover:text-accent-ink">
            Voir le tableau
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border-t border-line bg-card-2 px-3 py-2">
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            loading={busy}
            disabled={!plan.items.length}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreate();
              } finally {
                setBusy(false);
              }
            }}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Créer ces tâches
          </Button>
          <Button size="sm" variant="secondary" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Modifier
          </Button>
        </div>
      )}
    </div>
  );
}

function PlanRow({ item, index, done }: { item: PlanItem; index: number; done: boolean }) {
  const agent = useRoutedAgent(item);
  return (
    <li className="flex items-start gap-2 px-3 py-2">
      <span className={cn("mt-px w-4 shrink-0 font-mono text-[11px]", done ? "text-ok" : "text-ink-4")}>{done ? <Check className="h-3.5 w-3.5" aria-label="Créée" /> : `${index + 1}.`}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold leading-snug text-ink" title={item.title}>
          {item.title}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-ink-3">
          <span className="inline-flex shrink-0 items-center gap-1">
            <TypeIcon type={item.type} className="h-3 w-3" />
            {TASK_TYPE_META[item.type].label}
          </span>
          <PriorityMark priority={item.priority} />
          {agent ? <AgentBadge agent={agent} size="xs" className="ml-auto min-w-0" /> : null}
        </div>
      </div>
    </li>
  );
}
