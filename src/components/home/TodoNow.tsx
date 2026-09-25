"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Blocks, Check, CircleHelp, Eye, ListChecks, Rocket, RotateCcw } from "lucide-react";
import type { Task } from "@/lib/domain/types";
import { TASK_TYPE_META } from "@/lib/domain/types";
import { useStore, type DrawerTab } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";
import { cn, timeAgoCompact } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { HomeSection } from "./HomeSection";
import type { HomeData } from "./useHomeData";

type Tone = "accent" | "warn" | "danger" | "ai";

interface TodoItem {
  id: string;
  title: string;
  subtitle: string;
  at: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  rank: number;
  primary: { label: string; run: () => Promise<unknown> | void; variant: "primary" | "ai" | "danger" | "secondary"; icon?: React.ComponentType<{ className?: string }> };
  secondary?: { label: string; href?: string; run?: () => void };
}

const TONE_BG: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-ink",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  ai: "bg-ai-soft text-ai-ink",
};

const MAX = 6;

function taskItem(t: Task): TodoItem {
  const act = useStore.getState().act;
  const open = (tab?: DrawerTab) => useStore.getState().selectTask(t.id, tab);
  const type = TASK_TYPE_META[t.type].label;
  if (t.status === "failed") {
    return {
      id: t.id,
      title: t.title,
      subtitle: `${type} · échec : ${t.error ?? "erreur inconnue"}`,
      at: t.updatedAt,
      tone: "danger",
      icon: AlertTriangle,
      rank: 0,
      primary: { label: "Relancer", variant: "danger", icon: RotateCcw, run: () => act(t.id, { action: "retry" }) },
      secondary: { label: "Voir", run: () => open("activity") },
    };
  }
  if (t.status === "waiting_input") {
    const q = t.refinedSpec?.questions.find((x) => x.blocking)?.question ?? t.refinedSpec?.questions[0]?.question;
    return {
      id: t.id,
      title: t.title,
      subtitle: q ? `Question de l'IA : ${q}` : `${type} · l'IA a une question`,
      at: t.updatedAt,
      tone: "warn",
      icon: CircleHelp,
      rank: 1,
      primary: { label: "Répondre", variant: "secondary", run: () => open("spec") },
    };
  }
  if (t.stage === "plan") {
    return {
      id: t.id,
      title: t.title,
      subtitle: `${type} · plan en ${t.plan?.steps.length ?? "quelques"} étapes à valider`,
      at: t.updatedAt,
      tone: "ai",
      icon: ListChecks,
      rank: 2,
      primary: {
        label: "Valider le plan",
        variant: "ai",
        icon: Check,
        run: async () => {
          const r = await act(t.id, { action: "approve_plan" });
          if (r) toast.success("Plan validé. L'IA fabrique.");
        },
      },
      secondary: { label: "Voir", run: () => open("plan") },
    };
  }
  const reserves = t.verifyResult && !t.verifyResult.passed;
  return {
    id: t.id,
    title: t.title,
    subtitle: `${type} · ${reserves ? "contrôle avec réserves" : "prêt à valider"}`,
    at: t.updatedAt,
    tone: "accent",
    icon: Eye,
    rank: 2,
    primary: {
      label: "Valider",
      variant: "primary",
      icon: Check,
      run: async () => {
        const r = await act(t.id, { action: "approve" });
        if (r) toast.success("Résultat validé. L'IA intègre.");
      },
    },
    secondary: { label: "Relire", run: () => open("review") },
  };
}

/** « À traiter maintenant » : tâches HITL, livrables à valider, version en attente de revue. */
export function TodoNow({ data, index, className, style }: { data: HomeData; index: number; className?: string; style?: React.CSSProperties }) {
  const router = useRouter();
  const b = useBuildOS.getState();
  const { projectId } = data;

  const items: TodoItem[] = [...data.attentionTasks.map(taskItem)];
  if (data.pendingRelease && projectId) {
    const r = data.pendingRelease;
    items.push({
      id: r.id,
      title: `${r.version} — ${r.title}`,
      subtitle: `Mise en production · ${r.items.length} changement${r.items.length > 1 ? "s" : ""} attendent votre revue humaine`,
      at: r.createdAt,
      tone: "accent",
      icon: Rocket,
      rank: 3,
      primary: {
        label: "Approuver",
        variant: "primary",
        icon: Check,
        run: () => {
          b.approveRelease(projectId, r.id);
          toast.success(`${r.version} approuvée`, { description: "Direction la préproduction." });
        },
      },
      secondary: { label: "Voir", href: "/releases" },
    });
  }
  for (const d of data.toReviewDeliverables) {
    items.push({
      id: d.id,
      title: d.title,
      subtitle: `Fondation · v${d.version} à relire — ${d.summary}`,
      at: d.updatedAt,
      tone: "accent",
      icon: Blocks,
      rank: 4,
      primary: {
        label: "Valider",
        variant: "secondary",
        icon: Check,
        run: () => {
          if (!projectId) return;
          b.validateDeliverable(projectId, d.kind);
          toast.success(`${d.title} validé`);
        },
      },
      secondary: { label: "Relire", href: "/deliverables" },
    });
  }
  items.sort((a, c) => a.rank - c.rank || c.at.localeCompare(a.at));
  const shown = items.slice(0, MAX);
  const more = items.length - shown.length;

  return (
    <HomeSection index={index} title="À traiter maintenant" meta={items.length ? `${items.length}` : undefined} className={className} style={style} bodyClassName="px-2 pb-2 pt-2">
      {shown.length ? (
        <>
          <ul className="flex flex-col" aria-label="Éléments à traiter">
            {shown.map((it) => (
              <TodoRow key={it.id} item={it} />
            ))}
          </ul>
          {more > 0 ? (
            <button
              type="button"
              onClick={() => {
                useStore.getState().setFilters({ attention: true });
                router.push("/board");
              }}
              className="mx-2 mt-1 text-[12px] font-medium text-ink-3 hover:text-ink"
            >
              + {more} autre{more > 1 ? "s" : ""} sur le tableau
            </button>
          ) : null}
        </>
      ) : (
        <EmptyState icon={<Check />} title="Rien ne vous attend" description="L'IA avance seule. Profitez-en pour décrire la prochaine fonctionnalité." className="py-8" />
      )}
    </HomeSection>
  );
}

function TodoRow({ item }: { item: TodoItem }) {
  const [busy, setBusy] = React.useState(false);
  const Icon = item.icon;
  const PrimaryIcon = item.primary.icon;
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-paper-2/70">
      <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md", TONE_BG[item.tone])} aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink" title={item.title}>
          {item.title}
        </p>
        <p className="truncate text-[12px] text-ink-3" title={item.subtitle}>
          {item.subtitle}
        </p>
      </div>
      <time className="hidden shrink-0 font-mono text-[11px] text-ink-4 @[640px]/home:block" dateTime={item.at}>
        {timeAgoCompact(item.at)}
      </time>
      <div className="flex shrink-0 items-center gap-1">
        {item.secondary ? (
          item.secondary.href ? (
            <Link href={item.secondary.href} className="inline-flex h-7 items-center rounded-sm px-2 text-[12px] font-medium text-ink-2 hover:bg-paper-3 hover:text-ink">
              {item.secondary.label}
            </Link>
          ) : (
            <Button size="xs" variant="ghost" onClick={item.secondary.run}>
              {item.secondary.label}
            </Button>
          )
        ) : null}
        <Button
          size="xs"
          variant={item.primary.variant}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await item.primary.run();
            } finally {
              setBusy(false);
            }
          }}
        >
          {PrimaryIcon && !busy ? <PrimaryIcon className="h-3 w-3" aria-hidden /> : null}
          {item.primary.label}
        </Button>
      </div>
    </li>
  );
}
