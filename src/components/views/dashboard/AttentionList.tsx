"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, CircleHelp, Eye, RotateCcw, SearchCheck } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import { STAGE_META } from "@/lib/domain/stages";
import { useStore } from "@/lib/client/store";
import { cn, timeAgo } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge, TypeIcon } from "@/components/shared/task-bits";

type Quick = { label: string; icon: React.ReactNode; variant: "primary" | "secondary" };

function quickFor(t: Task): Quick {
  if (t.status === "waiting_input") return { label: "Répondre", icon: <CircleHelp className="h-3.5 w-3.5" />, variant: "secondary" };
  if (t.status === "failed") return { label: "Relancer", icon: <RotateCcw className="h-3.5 w-3.5" />, variant: "secondary" };
  if (t.stage === "plan") return { label: "Valider le plan", icon: <Check className="h-3.5 w-3.5" />, variant: "primary" };
  if (t.verifyResult && !t.verifyResult.passed) return { label: "Examiner", icon: <SearchCheck className="h-3.5 w-3.5" />, variant: "secondary" };
  return { label: "Valider", icon: <Check className="h-3.5 w-3.5" />, variant: "primary" };
}

/** Tâches qui attendent le fondateur, avec une action rapide par ligne. */
export function AttentionList({ tasks, now }: { tasks: Task[]; now: number }) {
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!tasks.length) {
    return <EmptyState className="py-6" icon={<Check />} title="Rien à traiter" description="L'IA avance. Vous serez prévenu dès qu'une validation ou une réponse sera nécessaire." />;
  }

  async function quick(t: Task) {
    const s = useStore.getState();
    if (t.status === "waiting_input") {
      s.selectTask(t.id, "spec");
      return;
    }
    if (t.status === "waiting_review" && t.stage !== "plan" && t.verifyResult && !t.verifyResult.passed) {
      s.selectTask(t.id, "review");
      return;
    }
    setBusy(t.id);
    try {
      if (t.status === "failed") {
        const r = await s.act(t.id, { action: "retry" });
        if (r) toast.success("Tâche relancée", { description: t.title });
      } else if (t.stage === "plan") {
        const r = await s.act(t.id, { action: "approve_plan" });
        if (r) toast.success("Plan validé, la fabrication démarre", { description: t.title });
      } else {
        const r = await s.act(t.id, { action: "approve" });
        if (r) toast.success("Résultat validé, intégration en cours", { description: t.title });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="-mx-2 flex flex-col" aria-label="Tâches à traiter">
      {tasks.map((t, i) => {
        const q = quickFor(t);
        const open = () => useStore.getState().selectTask(t.id);
        return (
          <li key={t.id} className="reveal" style={{ "--i": i } as React.CSSProperties}>
            <div
              role="button"
              tabIndex={0}
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  open();
                }
              }}
              className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-paper-2 focus-visible:bg-paper-2"
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", t.status === "failed" ? "bg-danger" : "bg-accent", t.status !== "failed" && "animate-blink")} aria-hidden />
              <TypeIcon type={t.type} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink" title={t.title}>
                  {t.title}
                </p>
                <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[11.5px] text-ink-3">
                  <StatusBadge status={t.status} size="xs" />
                  <span className="truncate">{t.status === "failed" && t.error ? t.error : t.lastActivity ?? STAGE_META[t.stage].label}</span>
                  <span className="shrink-0 font-mono">{timeAgo(t.updatedAt, new Date(now))}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Button size="xs" variant={q.variant} loading={busy === t.id} onClick={() => void quick(t)}>
                  {q.icon}
                  {q.label}
                </Button>
                <Button size="xs" variant="ghost" onClick={open} aria-label={`Voir « ${t.title} »`}>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Voir</span>
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
